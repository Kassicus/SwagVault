import { getOrgSlug } from "./context";
import { resolveOrgBySlug } from "./resolve";
import { TenantNotFoundError } from "../errors";
import type { Organization } from "../db/schema";

export async function getResolvedTenant(): Promise<Organization> {
  const slug = await getOrgSlug();
  if (!slug) {
    throw new TenantNotFoundError("unknown");
  }

  const org = await resolveOrgBySlug(slug);
  if (!org) {
    throw new TenantNotFoundError(slug);
  }

  return org;
}
