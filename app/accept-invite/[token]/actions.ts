'use server';

import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { hashInviteToken } from '@/lib/invites';

export type AcceptState = { error: string | null };

export async function acceptInviteAction(
  prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get('token') ?? '');
  if (!token) return { error: 'Missing invite token.' };

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    redirect(`/login?next=${encodeURIComponent(`/accept-invite/${token}`)}`);
  }

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
    return { error: 'Invite has expired.' };
  }
  if ((u.user.email ?? '').toLowerCase() !== invite.email.toLowerCase()) {
    return {
      error: `This invite is for ${invite.email}. Sign in with that email to accept.`,
    };
  }

  // Atomically mark accepted + create membership. If a membership already
  // exists (e.g. accidental double-click), upsert leaves it alone.
  const { error: memErr } = await service.from('memberships').upsert(
    {
      organization_id: invite.organization_id,
      user_id: u.user.id,
      role: invite.role,
    },
    { onConflict: 'organization_id,user_id', ignoreDuplicates: true },
  );
  if (memErr) return { error: memErr.message };

  await service
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);

  const org = invite.organizations as unknown as { slug: string };
  redirect(`/${org.slug}`);
}
