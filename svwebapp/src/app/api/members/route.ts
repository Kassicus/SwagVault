import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";

export async function GET() {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await getResolvedTenant();

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
