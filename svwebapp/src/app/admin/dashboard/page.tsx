import { eq, and, sql, count, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import {
  organizationMembers,
  balances,
  items,
  orders,
  users,
} from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const { stats, recentOrders, recentMembers } = await withTenant(org.id, async (tx) => {
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

    const recentOrders = await tx
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalCost: orders.totalCost,
        createdAt: orders.createdAt,
        userName: users.displayName,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.tenantId, org.id))
      .orderBy(desc(orders.createdAt))
      .limit(10);

    const recentMembers = await tx
      .select({
        id: organizationMembers.id,
        joinedAt: organizationMembers.joinedAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.tenantId, org.id))
      .orderBy(desc(organizationMembers.joinedAt))
      .limit(5);

    return {
      stats: {
        members: memberCount?.count ?? 0,
        currency: currencyInCirculation?.total ?? 0,
        items: activeItems?.count ?? 0,
        pendingOrders: pendingOrders?.count ?? 0,
      },
      recentOrders,
      recentMembers,
    };
  });

  // Merge and sort activity by timestamp
  type ActivityItem = {
    type: "order" | "member";
    timestamp: Date;
    description: string;
    detail?: string;
  };

  const activity: ActivityItem[] = [
    ...recentOrders.map((o) => ({
      type: "order" as const,
      timestamp: o.createdAt,
      description: `${o.userName} placed order #${o.orderNumber}`,
      detail: `${org.currencySymbol ?? "C"}${o.totalCost.toLocaleString()} - ${o.status}`,
    })),
    ...recentMembers.map((m) => ({
      type: "member" as const,
      timestamp: m.joinedAt,
      description: `${m.userName} joined`,
      detail: m.userEmail,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

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

      {/* Activity Feed */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        {activity.length === 0 ? (
          <div className="rounded-lg border border-border py-8 text-center text-sm text-muted-foreground">
            No activity yet
          </div>
        ) : (
          <div className="space-y-1">
            {activity.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      item.type === "order" ? "bg-primary" : "bg-success"
                    }`}
                  />
                  <span className="text-sm">{item.description}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {item.detail && <span>{item.detail}</span>}
                  <span>{formatRelativeTime(item.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
