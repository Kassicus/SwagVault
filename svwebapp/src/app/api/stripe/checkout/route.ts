"use server";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { createCustomer, createCheckoutSession } from "@/lib/stripe/client";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, priceId } = await request.json();
  if (!orgId || !priceId) {
    return NextResponse.json({ error: "Missing orgId or priceId" }, { status: 400 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await createCustomer(user.email, org.name, orgId);
    customerId = customer.id;
    await db
      .update(organizations)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(organizations.id, orgId));
  }

  const baseUrl = config.auth.url();
  const session = await createCheckoutSession({
    customerId,
    priceId,
    orgId,
    successUrl: `${baseUrl}/admin/billing?success=true&tenant=${org.slug}`,
    cancelUrl: `${baseUrl}/admin/billing?canceled=true&tenant=${org.slug}`,
  });

  return NextResponse.json({ url: session.url });
}
