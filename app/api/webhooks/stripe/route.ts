import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe/server';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { SubscriptionPlan, SubscriptionStatus } from '@/lib/supabase/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RELEVANT_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'STRIPE_WEBHOOK_SECRET not configured' },
      { status: 500 },
    );
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Idempotency: insert the event id first; if duplicate, we've already processed it.
  const payload = JSON.parse(JSON.stringify(event));
  const { error: dedupeErr } = await service.from('subscription_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    payload,
  });
  if (dedupeErr) {
    // 23505 is unique_violation — duplicate event.
    if ((dedupeErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: dedupeErr.message }, { status: 500 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'handler failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  const service = createSupabaseServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
      if (!subscriptionId) return;
      const sub = await stripe().subscriptions.retrieve(subscriptionId);
      await applySubscription(sub);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscription(sub);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
      if (!customerId) return;
      await service
        .from('organizations')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', customerId);
      break;
    }
  }

  // Best-effort: stamp the organization id onto the event row for the audit trail.
  const customerId = extractCustomerId(event);
  if (customerId) {
    const { data: org } = await service
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();
    if (org) {
      await service
        .from('subscription_events')
        .update({ organization_id: org.id })
        .eq('stripe_event_id', event.id);
    }
  }
}

async function applySubscription(sub: Stripe.Subscription) {
  const service = createSupabaseServiceClient();
  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

  const item = sub.items.data[0];
  const status = mapStatus(sub.status);
  const plan = mapPlanFromPriceId(item?.price.id);
  // Stripe moved period boundaries onto SubscriptionItem.
  const periodEndUnix = item?.current_period_end;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  await service
    .from('organizations')
    .update({
      subscription_status: status,
      subscription_plan: plan,
      current_period_end: periodEnd,
    })
    .eq('stripe_customer_id', customerId);
}

function mapStatus(s: Stripe.Subscription.Status): SubscriptionStatus {
  switch (s) {
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'incomplete':
    case 'unpaid':
      return s;
    case 'incomplete_expired':
      return 'canceled';
    case 'paused':
      return 'past_due';
    default:
      return 'incomplete';
  }
}

function mapPlanFromPriceId(priceId?: string | null): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly';
  if (priceId === process.env.STRIPE_PRICE_ANNUAL) return 'annual';
  return null;
}

function extractCustomerId(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: string | { id: string } };
  if (!obj?.customer) return null;
  return typeof obj.customer === 'string' ? obj.customer : obj.customer.id;
}
