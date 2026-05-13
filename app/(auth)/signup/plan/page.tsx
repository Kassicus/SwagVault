import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { isBillingEnabled } from '@/lib/billing/flag';
import { PlanForm } from './plan-form';

export const metadata = { title: 'Choose your plan · SwagVault' };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  if (!slug) redirect('/signup/org');

  // Defensive: if someone lands here while billing is disabled, send them home.
  if (!isBillingEnabled()) redirect(`/${slug}/admin`);

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/login');

  // Confirm the current user owns this org slug.
  const service = createSupabaseServiceClient();
  const { data: org } = await service
    .from('organizations')
    .select('id, name, slug, subscription_status')
    .eq('slug', slug)
    .maybeSingle();
  if (!org) redirect('/signup/org');

  const { data: membership } = await service
    .from('memberships')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', data.user.id)
    .maybeSingle();
  if (!membership || membership.role !== 'owner') redirect('/login');

  // If already subscribed, skip ahead.
  if (org.subscription_status === 'active' || org.subscription_status === 'trialing') {
    redirect(`/${org.slug}/admin`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a plan for {org.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <PlanForm slug={org.slug} />
      </CardContent>
    </Card>
  );
}
