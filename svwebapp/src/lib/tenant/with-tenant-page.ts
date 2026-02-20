import { eq } from "drizzle-orm";
import { getOrgSlug } from "./context";
import { resolveOrgBySlug } from "./resolve";
import { TenantNotFoundError } from "../errors";
import { db } from "../db";
import { organizationMembers, organizations, type Organization } from "../db/schema";
import { getCurrentUser } from "../auth/utils";

export async function getResolvedTenant(): Promise<Organization> {
  const slug = await getOrgSlug();

  if (slug) {
    const org = await resolveOrgBySlug(slug);
    if (!org) {
      throw new TenantNotFoundError(slug);
    }
    return org;
  }

  // Fallback: resolve org from the authenticated user's membership
  const user = await getCurrentUser();
  if (user) {
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
      with: { organization: true },
    });
    if (membership?.organization) {
      return membership.organization as Organization;
    }
  }

  throw new TenantNotFoundError("unknown");
}
