import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, MemberRole } from '@/lib/supabase/types';

export type Role = MemberRole;

export type OrgContext = {
  userId: string;
  organizationId: string;
  role: Role;
  organization: Pick<
    Database['public']['Tables']['organizations']['Row'],
    'id' | 'slug' | 'name' | 'subscription_status' | 'fulfillment_mode'
  >;
};

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

export async function requireOrg(slug: string): Promise<OrgContext> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('memberships')
    .select(
      'role, organization_id, organizations!inner(id, slug, name, subscription_status, fulfillment_mode)',
    )
    .eq('user_id', user.id)
    .eq('organizations.slug', slug)
    .maybeSingle();

  if (error || !data) {
    // proxy.ts should have caught this; defensive 404 if a route is reached
    // through a path the matcher missed.
    redirect('/');
  }

  const organization = data.organizations as unknown as OrgContext['organization'];

  return {
    userId: user.id,
    organizationId: data.organization_id,
    role: data.role,
    organization,
  };
}

export async function requireAdmin(slug: string): Promise<OrgContext> {
  const ctx = await requireOrg(slug);
  if (ctx.role === 'member') redirect(`/${slug}`);
  return ctx;
}
