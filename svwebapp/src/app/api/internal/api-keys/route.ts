import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { withTenant } from "@/lib/db/tenant";
import { apiKeys } from "@/lib/db/schema";

export async function GET() {
  try {
    await requireAuth();
    const org = await getResolvedTenant();

    const keys = await withTenant(org.id, async (tx) => {
      return tx
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          permissions: apiKeys.permissions,
          lastUsedAt: apiKeys.lastUsedAt,
          createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.tenantId, org.id))
        .orderBy(apiKeys.createdAt);
    });

    return NextResponse.json({ keys });
  } catch {
    return NextResponse.json({ keys: [] }, { status: 401 });
  }
}
