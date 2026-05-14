'use server';

import { redirect } from 'next/navigation';
import { checkBotId } from 'botid/server';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invites';
import { findUserByEmail } from '@/lib/auth/admin';
import { findLandingPathForUser } from '@/lib/auth/landing';
import { logAudit } from '@/lib/audit/log';

export type AcceptState = { error: string | null };

export async function acceptInviteAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const verification = await checkBotId();
  if (!verification.isHuman && !verification.bypassed) {
    return { error: 'Verification failed. Refresh and try again.' };
  }

  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (!token) return { error: 'Missing invite token.' };
  if (!password || password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const service = createSupabaseServiceClient();
  const hash = hashInviteToken(token);

  const { data: invite } = await service
    .from('invites')
    .select(
      'id, organization_id, email, role, expires_at, accepted_at, organizations!inner(slug)',
    )
    .eq('token_hash', hash)
    .maybeSingle();

  if (!invite) return { error: 'Invite not found.' };
  if (invite.accepted_at) return { error: 'Invite has already been used.' };
  if (new Date(invite.expires_at) < new Date()) {
    return { error: 'Invite has expired — ask your admin to resend.' };
  }

  // Edge case: between the admin sending the invite and the user clicking,
  // the same email signed up directly. Detect and reject — they should sign in
  // with their existing account instead of setting a new password.
  const existing = await findUserByEmail(service, invite.email);
  if (existing) {
    return {
      error:
        'An account with this email already exists. Sign in and we\'ll redirect you.',
    };
  }

  // Create the auth user with email already confirmed so they can sign in
  // immediately, no verification email round-trip.
  const { data: created, error: createErr } =
    await service.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    });
  if (createErr || !created?.user) {
    return {
      error: createErr?.message ?? 'Could not create your account.',
    };
  }

  // Insert the membership. Service-role bypasses RLS.
  const { error: memErr } = await service.from('memberships').insert({
    organization_id: invite.organization_id,
    user_id: created.user.id,
    role: invite.role,
  });
  if (memErr) {
    // Roll back the user so a retry can succeed.
    await service.auth.admin.deleteUser(created.user.id);
    return { error: memErr.message };
  }

  // Mark invite consumed.
  await service
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  // The actor is the new user themselves — they accepted their own invite.
  await logAudit({
    organizationId: invite.organization_id,
    actorUserId: created.user.id,
    action: 'invite_accepted',
    targetType: 'invite',
    targetId: invite.id,
    metadata: { email: invite.email, role: invite.role },
  });

  // Sign the user in with their new password so they land in their org.
  const supabase = await createSupabaseServerClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password,
  });
  if (signInErr) {
    // Account exists, password set, membership exists — they just need to log
    // in manually. Surface and redirect.
    return {
      error: `Account created. Please sign in manually: ${signInErr.message}`,
    };
  }

  redirect(await findLandingPathForUser(created.user.id));
}
