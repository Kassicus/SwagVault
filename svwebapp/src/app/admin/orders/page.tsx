import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { orders, users } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

const statusVariants = {
  pending: "warning",
  approved: "default",
  fulfilled: "success",
  cancelled: "destructive",
} as const;

export default async function AdminOrdersPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const allOrders = await withTenant(org.id, async (tx) => {
    return tx
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalCost: orders.totalCost,
        createdAt: orders.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.tenantId, org.id))
      .orderBy(desc(orders.createdAt));
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage order fulfillment
        </p>
      </div>

      {allOrders.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
          No orders yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Order
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Customer
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Total
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      #{order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{order.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.userEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(order.totalCost, org.currencySymbol ?? "C")}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariants[order.status]}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
