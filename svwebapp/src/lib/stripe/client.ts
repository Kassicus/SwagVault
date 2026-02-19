import Stripe from "stripe";
import { config } from "@/lib/config";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(config.stripe.secretKey(), {
      apiVersion: "2026-01-28.clover",
    });
  }
  return stripeInstance;
}

export async function createCustomer(email: string, name: string, orgId: string) {
  const stripe = getStripe();
  return stripe.customers.create({
    email,
    name,
    metadata: { orgId },
  });
}

export async function createCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  orgId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    customer: opts.customerId,
    mode: "subscription",
    line_items: [{ price: opts.priceId, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { orgId: opts.orgId },
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(subscriptionId: string) {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function getInvoices(customerId: string, limit = 10) {
  const stripe = getStripe();
  return stripe.invoices.list({ customer: customerId, limit });
}
