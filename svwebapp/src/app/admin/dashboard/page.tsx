import { eq, and, sql, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  organizationMembers,
  balances,
  items,
  orders,
} from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { StatCard } from "@/components/admin/stat-card";

export default async function DashboardPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const stats = await withTenant(org.id, async (tx) => {
    const [memberCount] = await tx
      .select({ count: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.tenantId, org.id),
          eq(organizationMembers.isActive, true)
        )
      );

    const [currencyInCirculation] = await tx
      .select({ total: sql<number>`COALESCE(SUM(${balances.balance}), 0)` })
      .from(balances)
      .where(eq(balances.tenantId, org.id));

    const [activeItems] = await tx
      .select({ count: count() })
      .from(items)
      .where(and(eq(items.tenantId, org.id), eq(items.isActive, true)));

    const [pendingOrders] = await tx
      .select({ count: count() })
      .from(orders)
      .where(
        and(eq(orders.tenantId, org.id), eq(orders.status, "pending"))
      );

    return {
      members: memberCount?.count ?? 0,
      currency: currencyInCirculation?.total ?? 0,
      items: activeItems?.count ?? 0,
      pendingOrders: pendingOrders?.count ?? 0,
    };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome to {org.name}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Members"
          value={stats.members}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
        />
        <StatCard
          label={`${org.currencyName ?? "Credits"} in Circulation`}
          value={`${org.currencySymbol ?? "C"}${stats.currency.toLocaleString()}`}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Items"
          value={stats.items}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          }
        />
        <StatCard
          label="Pending Orders"
          value={stats.pendingOrders}
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
