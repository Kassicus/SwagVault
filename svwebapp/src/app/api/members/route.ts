import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/utils";
import { getOrgSlug } from "@/lib/tenant/context";
import { resolveOrgBySlug } from "@/lib/tenant/resolve";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = await getOrgSlug();
  if (!slug) {
    return NextResponse.json({ error: "No tenant" }, { status: 400 });
  }

  const org = await resolveOrgBySlug(slug);
  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const members = await withTenant(org.id, async (tx) => {
    return tx
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.tenantId, org.id));
  });

  return NextResponse.json({ members });
}
