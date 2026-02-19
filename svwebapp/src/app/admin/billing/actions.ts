"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { config } from "@/lib/config";
import {
  createCustomer,
  createCheckoutSession,
  createBillingPortalSession,
} from "@/lib/stripe/client";

export async function createCheckout(priceId: string) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await createCustomer(user.email, org.name, org.id);
    customerId = customer.id;
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(organizations.id, org.id));
  }

  const baseUrl = config.auth.url();
  const session = await createCheckoutSession({
    customerId,
    priceId,
    orgId: org.id,
    successUrl: `${baseUrl}/admin/billing?success=true&tenant=${org.slug}`,
    cancelUrl: `${baseUrl}/admin/billing?canceled=true&tenant=${org.slug}`,
  });

  if (session.url) {
    redirect(session.url);
  }
}

export async function openBillingPortal(): Promise<void> {
  const org = await getResolvedTenant();

  if (!org.stripeCustomerId) {
    throw new Error("No billing account found");
  }

  const baseUrl = config.auth.url();
  const session = await createBillingPortalSession(
    org.stripeCustomerId,
    `${baseUrl}/admin/billing?tenant=${org.slug}`
  );

  if (session.url) {
    redirect(session.url);
  }
}
