import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type Role = 'owner' | 'admin' | 'member';

export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function requireUser() {
  const user = await getSession();
  if (!user) redirect('/login');
  return user;
}

// Resolves the membership row for the given org slug; redirects if the user
// is not a member. Returns role + organization_id so callers can branch.
export async function requireOrg(slug: string): Promise<{
  userId: string;
  organizationId: string;
  role: Role;
}> {
  await requireUser();
  // TODO(phase 1): look up organization by `slug` and the user's membership row.
  throw new Error(`requireOrg(${slug}) not implemented — wire up in Phase 1`);
}

export async function requireAdmin(slug: string) {
  const m = await requireOrg(slug);
  if (m.role === 'member') redirect(`/${slug}`);
  return m;
}
