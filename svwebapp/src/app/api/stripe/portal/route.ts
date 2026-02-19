"use server";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/utils";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { createBillingPortalSession } from "@/lib/stripe/client";
import { config } from "@/lib/config";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = await request.json();
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const baseUrl = config.auth.url();
  const session = await createBillingPortalSession(
    org.stripeCustomerId,
    `${baseUrl}/admin/billing?tenant=${org.slug}`
  );

  return NextResponse.json({ url: session.url });
}
