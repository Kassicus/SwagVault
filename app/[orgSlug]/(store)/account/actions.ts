'use server';

import { revalidatePath } from 'next/cache';
import { requireOrg } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function setLeaderboardVisibilityAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const visible = formData.get('visible') === 'true';

  const ctx = await requireOrg(slug);

  // Members can update their own row via RLS — no service-role needed.
  const supabase = await createSupabaseServerClient();
  await supabase
    .from('memberships')
    .update({ leaderboard_visible: visible })
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.userId);

  revalidatePath(`/${slug}/account`);
  revalidatePath(`/${slug}/leaderboard`);
}
