"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizations,
  users,
  organizationMembers,
  balances,
} from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/utils";
import { createSession } from "@/lib/auth/session";
import {
  createAccountSchema,
  createOrgSchema,
  configureCurrencySchema,
} from "@/lib/validators/signup";

export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true },
  });
  return { available: !existing };
}

export async function createAccount(formData: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  const parsed = createAccountSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, password, displayName } = parsed.data;

  // Check if user already exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existing) {
    return { success: false, error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, displayName })
    .returning({ id: users.id });

  return { success: true, userId: user.id };
}

export async function createOrganization(formData: {
  userId: string;
  name: string;
  slug: string;
}): Promise<{ success: boolean; orgId?: string; error?: string }> {
  const parsed = createOrgSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, slug } = parsed.data;
  const { userId } = formData;

  // Check slug availability
  const slugCheck = await checkSlugAvailability(slug);
  if (!slugCheck.available) {
    return { success: false, error: "This slug is already taken" };
  }

  // Create org, membership, and balance in a transaction
  const result = await db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name,
        slug,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .returning({ id: organizations.id });

    await tx.insert(organizationMembers).values({
      tenantId: org.id,
      userId,
      role: "owner",
    });

    await tx.insert(balances).values({
      tenantId: org.id,
      userId,
      balance: 0,
    });

    return org;
  });

  return { success: true, orgId: result.id };
}

export async function configureCurrency(formData: {
  orgId: string;
  currencyName: string;
  currencySymbol: string;
}): Promise<{ success: boolean; error?: string }> {
  const parsed = configureCurrencySchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { currencyName, currencySymbol } = parsed.data;

  await db
    .update(organizations)
    .set({
      currencyName,
      currencySymbol,
      setupComplete: true,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, formData.orgId));

  return { success: true };
}

export async function signInAfterSignup(userId: string, email: string, displayName: string) {
  await createSession({ id: userId, email, displayName });
}
