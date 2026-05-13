'use server';

import { redirect } from 'next/navigation';
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from '@/lib/supabase/server';
import { PRICE_IDS, stripe } from '@/lib/stripe/server';

export type PlanState = { error: string | null };

export async function startCheckoutAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const plan = String(formData.get('plan') ?? '') as 'monthly' | 'annual';
  if (!slug || (plan !== 'monthly' && plan !== 'annual')) {
    return { error: 'Missing plan selection.' };
  }

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect('/login');

  const service = createSupabaseServiceClient();
  const { data: org } = await service
    .from('organizations')
    .select('id, slug, name, stripe_customer_id')
    .eq('slug', slug)
    .maybeSingle();
  if (!org) return { error: 'Organization not found.' };

  const { data: membership } = await service
    .from('memberships')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', u.user.id)
    .maybeSingle();
  if (!membership || membership.role !== 'owner') {
    return { error: 'Only the org owner can manage billing.' };
  }

  const s = stripe();
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await s.customers.create({
      email: u.user.email ?? undefined,
      name: org.name,
      metadata: { organization_id: org.id, organization_slug: org.slug },
    });
    customerId = customer.id;
    await service
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id);
  }

  const priceId = plan === 'monthly' ? PRICE_IDS.monthly() : PRICE_IDS.annual();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${appUrl}/${org.slug}/admin?checkout=success`,
    cancel_url: `${appUrl}/signup/plan?slug=${encodeURIComponent(org.slug)}`,
    subscription_data: {
      metadata: { organization_id: org.id, organization_slug: org.slug },
    },
    metadata: { organization_id: org.id, organization_slug: org.slug },
  });

  if (!session.url) return { error: 'Stripe did not return a checkout URL.' };
  redirect(session.url);
}
