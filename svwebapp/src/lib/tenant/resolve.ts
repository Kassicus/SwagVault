import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizations, type Organization } from "../db/schema";

export async function resolveOrgBySlug(
  slug: string
): Promise<Organization | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  return org ?? null;
}
