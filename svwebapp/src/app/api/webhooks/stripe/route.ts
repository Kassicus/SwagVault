import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getStripe } from "@/lib/stripe/client";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret()
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      if (orgId && session.subscription) {
        await db
          .update(organizations)
          .set({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripeSubscriptionStatus: "active",
            updatedAt: new Date(),
          })
          .where(eq(organizations.id, orgId));
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await db
        .update(organizations)
        .set({
          stripeSubscriptionStatus: subscription.status,
          updatedAt: new Date(),
        })
        .where(eq(organizations.stripeCustomerId, customerId));
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await db
        .update(organizations)
        .set({
          stripeSubscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(organizations.stripeCustomerId, customerId));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      await db
        .update(organizations)
        .set({
          stripeSubscriptionStatus: "past_due",
          updatedAt: new Date(),
        })
        .where(eq(organizations.stripeCustomerId, customerId));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
