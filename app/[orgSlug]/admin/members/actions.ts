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
