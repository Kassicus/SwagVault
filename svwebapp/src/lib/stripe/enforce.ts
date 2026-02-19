import { eq, and, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, items, organizations } from "@/lib/db/schema";
import { getPlanLimits, type PlanLimits } from "./plans";

export async function getOrgPlan(orgId: string) {
  const { db } = await import("@/lib/db");
  const [org] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, orgId));
  return org?.plan ?? "pro";
}

export async function getPlanUsage(orgId: string) {
  return withTenant(orgId, async (tx) => {
    const [memberCount] = await tx
      .select({ count: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.tenantId, orgId),
          eq(organizationMembers.isActive, true)
        )
      );

    const [itemCount] = await tx
      .select({ count: count() })
      .from(items)
      .where(eq(items.tenantId, orgId));

    return {
      members: memberCount?.count ?? 0,
      items: itemCount?.count ?? 0,
    };
  });
}

export async function checkPlanLimit(
  orgId: string,
  resource: "members" | "items"
): Promise<{ allowed: boolean; limit: number | null; current: number }> {
  const plan = await getOrgPlan(orgId);
  const limits = getPlanLimits(plan);
  const usage = await getPlanUsage(orgId);

  const limitKey = resource === "members" ? "maxMembers" : "maxItems";
  const limit = limits[limitKey];
  const current = usage[resource];

  if (limit === null) {
    return { allowed: true, limit: null, current };
  }

  return { allowed: current < limit, limit, current };
}

export async function requirePlanFeature(
  orgId: string,
  feature: keyof PlanLimits
): Promise<boolean> {
  const plan = await getOrgPlan(orgId);
  const limits = getPlanLimits(plan);
  return !!limits[feature];
}
