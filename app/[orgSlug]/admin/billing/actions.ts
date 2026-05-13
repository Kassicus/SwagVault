'use server';

import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export async function openCustomerPortalAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  if (!slug) throw new Error('Missing slug.');

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data: org } = await service
    .from('organizations')
    .select('id, slug, stripe_customer_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!org || !org.stripe_customer_id) {
    throw new Error('Organization is not yet linked to Stripe.');
  }

  // Confirm the requester is an admin of this org.
  const { data: membership } = await service
    .from('memberships')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', u.user.id)
    .maybeSingle();
  if (!membership || membership.role === 'member') {
    throw new Error('Only admins can manage billing.');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripe_customer_id,
    return_url: `${appUrl}/${org.slug}/admin/billing`,
  });
  redirect(session.url);
}
