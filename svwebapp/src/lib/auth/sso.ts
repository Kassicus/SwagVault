import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, organizationMembers, balances, organizations } from "@/lib/db/schema";

export async function findOrCreateSsoUser(profile: {
  email: string;
  name: string;
  image?: string | null;
}) {
  let user = await db.query.users.findFirst({
    where: eq(users.email, profile.email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: profile.email,
        displayName: profile.name || profile.email.split("@")[0],
        avatarUrl: profile.image ?? null,
        passwordHash: null,
      })
      .returning();
    user = newUser;
  }

  return user;
}

export async function linkUserToOrg(userId: string, orgId: string) {
  const existing = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.tenantId, orgId),
      eq(organizationMembers.userId, userId)
    ),
  });

  if (!existing) {
    await db.insert(organizationMembers).values({
      tenantId: orgId,
      userId,
      role: "member",
    });
    await db.insert(balances).values({
      tenantId: orgId,
      userId,
      balance: 0,
    });
  }
}

export async function findOrgBySsoTenant(ssoTenantId: string) {
  return db.query.organizations.findFirst({
    where: and(
      eq(organizations.ssoProvider, "microsoft"),
      eq(organizations.ssoTenantId, ssoTenantId)
    ),
  });
}
