import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { orders } from "@/lib/db/schema";
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

export default async function OrdersPage() {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const userOrders = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, org.id), eq(orders.userId, user.id)))
      .orderBy(desc(orders.createdAt));
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">My Orders</h1>

      {userOrders.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No orders yet</p>
          <Link href="/" className="mt-2 text-sm text-primary hover:underline">
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {userOrders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">Order #{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {formatCurrency(order.totalCost, org.currencySymbol ?? "C")}
                </span>
                <Badge variant={statusVariants[order.status]}>
                  {order.status}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
