'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateInviteToken, INVITE_TTL_DAYS } from '@/lib/invites';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates/invite';

export type InviteState = { error: string | null; success: string | null };

export async function inviteMemberAction(
  prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = (String(formData.get('role') ?? 'member') as
    | 'admin'
    | 'member');

  if (!email) return { error: 'Email is required.', success: null };
  if (role !== 'admin' && role !== 'member') {
    return { error: 'Invalid role.', success: null };
  }

  const ctx = await requireAdmin(slug);

  if (
    ctx.organization.subscription_status !== 'active' &&
    ctx.organization.subscription_status !== 'trialing'
  ) {
    return {
      error: 'Subscription must be active to send invites.',
      success: null,
    };
  }

  const service = createSupabaseServiceClient();

  // We can't easily look up users by email without an admin-API call. The
  // accept-invite handler upserts memberships, so a duplicate invite is a no-op.

  const { token, hash } = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: insErr } = await service.from('invites').insert({
    organization_id: ctx.organizationId,
    email,
    role,
    token_hash: hash,
    expires_at: expiresAt,
    created_by: ctx.userId,
  });
  if (insErr) return { error: insErr.message, success: null };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const acceptUrl = `${appUrl}/accept-invite/${token}`;
  const tmpl = inviteEmail({
    orgName: ctx.organization.name,
    acceptUrl,
    invitedBy: null,
  });

  const { error: emailErr } = await resend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
  });
  if (emailErr) {
    return {
      error: `Invite created but email failed: ${emailErr.message}`,
      success: null,
    };
  }

  revalidatePath(`/${slug}/admin/members`);
  return { error: null, success: `Invite sent to ${email}.` };
}

export type GrantState = {
  error: string | null;
  success: string | null;
};

// Inserts a `grant` transaction for each recipient. The after-insert trigger
// on transactions keeps memberships.balance_minor_units up to date.
//
// Amount is in display units (e.g. "100"); the action scales to minor units
// using the org's currency.decimal_places.
export async function grantBalanceAction(input: {
  slug: string;
  userIds: string[];
  amount: number;
  note: string;
}): Promise<GrantState> {
  const ctx = await requireAdmin(input.slug);
  const service = createSupabaseServiceClient();

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { error: 'Amount must be greater than 0.', success: null };
  }
  if (input.userIds.length === 0) {
    return { error: 'Pick at least one recipient.', success: null };
  }
  if (input.note && input.note.length > 200) {
    return { error: 'Note must be 200 characters or fewer.', success: null };
  }

  // Scale display amount → minor units via the org's currency.
  const { data: currency, error: cErr } = await service
    .from('organization_currencies')
    .select('decimal_places')
    .eq('organization_id', ctx.organizationId)
    .single();
  if (cErr || !currency) {
    return { error: cErr?.message ?? 'Currency not found.', success: null };
  }
  const scale = 10 ** currency.decimal_places;
  const minorUnits = Math.round(input.amount * scale);
  if (minorUnits <= 0) {
    return { error: 'Amount must round to at least 1 minor unit.', success: null };
  }

  // Guard: every userId must be a member of this org. RLS would block other
  // orgs at SELECT time, but service-role bypasses RLS, so we check manually.
  const { data: memberRows, error: mErr } = await service
    .from('memberships')
    .select('user_id')
    .eq('organization_id', ctx.organizationId)
    .in('user_id', input.userIds);
  if (mErr) return { error: mErr.message, success: null };
  const validIds = new Set((memberRows ?? []).map((m) => m.user_id));
  const finalIds = input.userIds.filter((id) => validIds.has(id));
  if (finalIds.length === 0) {
    return { error: 'No valid recipients found.', success: null };
  }

  const rows = finalIds.map((uid) => ({
    organization_id: ctx.organizationId,
    user_id: uid,
    kind: 'grant' as const,
    amount_minor_units: minorUnits,
    actor_user_id: ctx.userId,
    note: input.note || null,
  }));

  const { error: insErr } = await service.from('transactions').insert(rows);
  if (insErr) return { error: insErr.message, success: null };

  revalidatePath(`/${input.slug}/admin/members`);
  return {
    error: null,
    success: `Granted to ${finalIds.length} member${finalIds.length === 1 ? '' : 's'}.`,
  };
}
