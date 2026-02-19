"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, organizationMembers, organizations } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { signIn } from "@/lib/auth/config";

export async function loginAction(formData: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  error?: string;
  orgSlug?: string;
  role?: string;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, formData.email),
  });

  if (!user || !user.passwordHash) {
    return { success: false, error: "Invalid email or password" };
  }

  const valid = await verifyPassword(formData.password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid email or password" };
  }

  await createSession({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  });

  // Look up the user's first organization and role for redirect
  const membership = await db
    .select({
      slug: organizations.slug,
      role: organizationMembers.role,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.tenantId))
    .where(eq(organizationMembers.userId, user.id))
    .limit(1);

  return {
    success: true,
    orgSlug: membership[0]?.slug ?? undefined,
    role: membership[0]?.role ?? undefined,
  };
}

export async function ssoLoginAction(formData: FormData): Promise<void> {
  const tenant = formData.get("tenant") as string;
  const redirectTo = tenant ? `/?tenant=${tenant}` : "/";
  await signIn("microsoft-entra-id", { redirectTo });
}
