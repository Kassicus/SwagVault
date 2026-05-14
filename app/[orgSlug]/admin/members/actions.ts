'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { generateInviteToken, INVITE_TTL_DAYS } from '@/lib/invites';
import {
  resend,
  FROM_EMAIL,
  REPLY_TO,
  transactionalHeaders,
} from '@/lib/email/resend';
import { inviteEmail } from '@/lib/email/templates/invite';
import { addedToOrgEmail } from '@/lib/email/templates/added-to-org';
import { findUserByEmail } from '@/lib/auth/admin';

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  // Branch A: email already has a SwagVault account (multi-org case).
  // Skip the password-set flow entirely — just upsert the membership and
  // point them at /login.
  const existingUser = await findUserByEmail(service, email);
  if (existingUser) {
    const { error: memErr } = await service.from('memberships').upsert(
      {
        organization_id: ctx.organizationId,
        user_id: existingUser.id,
        role,
      },
      { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
    );
    if (memErr) return { error: memErr.message, success: null };

    const signInUrl = `${appUrl}/login?next=${encodeURIComponent(`/${slug}`)}`;
    const tmpl = addedToOrgEmail({
      orgName: ctx.organization.name,
      signInUrl,
    });
    const { error: emailErr } = await resend().emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      headers: transactionalHeaders(),
    });
    if (emailErr) {
      return {
        error: `Member added but email failed: ${emailErr.message}`,
        success: null,
      };
    }

    revalidatePath(`/${slug}/admin/members`);
    return {
      error: null,
      success: `${email} already had an account — added to ${ctx.organization.name}.`,
    };
  }

  // Branch B: brand new user. Create an invite token and email them a
  // password-set link.
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

  const acceptUrl = `${appUrl}/accept-invite/${token}`;
  const tmpl = inviteEmail({
    orgName: ctx.organization.name,
    acceptUrl,
    invitedBy: null,
  });

  const { error: emailErr } = await resend().emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
    headers: transactionalHeaders(),
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

export type InviteRowState = {
  error: string | null;
  success: string | null;
};

// Re-issues a pending invite: rotates the token, bumps the expiry, and sends
// the email again. If between the original invite and the resend the email
// already became a Supabase user (signed up directly), we resolve cleanly by
// upserting the membership and deleting the invite row.
export async function resendInviteAction(
  _prev: InviteRowState,
  formData: FormData,
): Promise<InviteRowState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const inviteId = String(formData.get('invite_id') ?? '');
  if (!inviteId) return { error: 'Missing invite id.', success: null };

  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { data: invite, error: fErr } = await service
    .from('invites')
    .select('id, email, role, accepted_at')
    .eq('id', inviteId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (fErr) return { error: fErr.message, success: null };
  if (!invite) return { error: 'Invite not found.', success: null };
  if (invite.accepted_at) {
    return { error: 'Invite has already been used.', success: null };
  }

  // Did the email sign up directly in the meantime?
  const existingUser = await findUserByEmail(service, invite.email);
  if (existingUser) {
    const { error: memErr } = await service.from('memberships').upsert(
      {
        organization_id: ctx.organizationId,
        user_id: existingUser.id,
        role: invite.role,
      },
      { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
    );
    if (memErr) return { error: memErr.message, success: null };

    await service.from('invites').delete().eq('id', invite.id);

    const signInUrl = `${appUrl}/login?next=${encodeURIComponent(`/${slug}`)}`;
    const tmpl = addedToOrgEmail({
      orgName: ctx.organization.name,
      signInUrl,
    });
    await resend().emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: invite.email,
      subject: tmpl.subject,
      html: tmpl.html,
      text: tmpl.text,
      headers: transactionalHeaders(),
    });

    revalidatePath(`/${slug}/admin/members`);
    return {
      error: null,
      success: `${invite.email} signed up directly — added to ${ctx.organization.name}.`,
    };
  }

  // Standard resend: rotate token, bump expiry, send fresh email.
  const { token, hash } = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error: upErr } = await service
    .from('invites')
    .update({ token_hash: hash, expires_at: expiresAt })
    .eq('id', invite.id);
  if (upErr) return { error: upErr.message, success: null };

  const acceptUrl = `${appUrl}/accept-invite/${token}`;
  const tmpl = inviteEmail({
    orgName: ctx.organization.name,
    acceptUrl,
    invitedBy: null,
  });
  const { error: emailErr } = await resend().emails.send({
    from: FROM_EMAIL,
    replyTo: REPLY_TO,
    to: invite.email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
    headers: transactionalHeaders(),
  });
  if (emailErr) {
    return {
      error: `Invite rotated but email failed: ${emailErr.message}`,
      success: null,
    };
  }

  revalidatePath(`/${slug}/admin/members`);
  return { error: null, success: `Invite resent to ${invite.email}.` };
}

// Deletes a pending invite. The original token becomes invalid immediately
// because it was hashed against the row that no longer exists.
export async function revokeInviteAction(
  _prev: InviteRowState,
  formData: FormData,
): Promise<InviteRowState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const inviteId = String(formData.get('invite_id') ?? '');
  if (!inviteId) return { error: 'Missing invite id.', success: null };

  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();

  const { data: invite, error: fErr } = await service
    .from('invites')
    .select('id, email, accepted_at')
    .eq('id', inviteId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (fErr) return { error: fErr.message, success: null };
  if (!invite) return { error: 'Invite not found.', success: null };
  if (invite.accepted_at) {
    return { error: 'Already-accepted invites cannot be revoked.', success: null };
  }

  const { error } = await service.from('invites').delete().eq('id', invite.id);
  if (error) return { error: error.message, success: null };

  revalidatePath(`/${slug}/admin/members`);
  return { error: null, success: `Revoked invite for ${invite.email}.` };
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
