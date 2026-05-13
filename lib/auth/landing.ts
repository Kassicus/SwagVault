import { createSupabaseServiceClient } from '@/lib/supabase/server';

// After login (or signup), decide where to drop the user.
// - No memberships → continue org setup at /signup/org
// - Owner/admin   → /<slug>/admin
// - Member        → /<slug>
export async function findLandingPathForUser(userId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data: memberships } = await supabase
    .from('memberships')
    .select('role, organization_id, organizations!inner(slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  const m = memberships?.[0];
  if (!m) return '/signup/org';

  // Supabase returns the joined row as `organizations` (single object since the
  // FK is to a single row), but the types model it as an array when generated
  // automatically. Cast loosely here.
  const org = m.organizations as unknown as { slug: string };
  const slug = org.slug;
  return m.role === 'member' ? `/${slug}` : `/${slug}/admin`;
}
