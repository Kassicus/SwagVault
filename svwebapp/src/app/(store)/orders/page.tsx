import { eq, and, desc, count } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { orders } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";

const statusVariants = {
  pending: "warning",
  approved: "default",
  fulfilled: "success",
  cancelled: "destructive",
} as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);

  const { data: userOrders, total } = await withTenant(org.id, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(orders)
      .where(and(eq(orders.tenantId, org.id), eq(orders.userId, user.id)));

    const data = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.tenantId, org.id), eq(orders.userId, user.id)))
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { data, total: countResult?.count ?? 0 };
  });

  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;

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
        <>
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
          <Pagination
            currentPage={page}
            totalPages={totalPages(total, pageSize)}
            baseParams={baseParams}
          />
        </>
      )}
    </div>
  );
}
