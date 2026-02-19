import { eq, desc, asc, count } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { orders, users } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";

const statusVariants = {
  pending: "warning",
  approved: "default",
  fulfilled: "success",
  cancelled: "destructive",
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sortMap: Record<string, any> = {
  date: orders.createdAt,
  total: orders.totalCost,
  order: orders.orderNumber,
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize, sort, order } = parsePaginationParams(params);

  const { data: allOrders, total } = await withTenant(org.id, async (tx) => {
    const sortCol = sortMap[sort ?? ""] ?? orders.createdAt;
    const orderFn = order === "asc" ? asc : desc;

    const [countResult] = await tx
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.tenantId, org.id));

    const data = await tx
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
      .orderBy(orderFn(sortCol))
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { data, total: countResult?.count ?? 0 };
  });

  const sym = org.currencySymbol ?? "C";
  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;
  if (sort) baseParams.sort = sort;
  if (order) baseParams.order = order;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage order fulfillment ({total} total)
        </p>
      </div>

      <DataTable
        columns={[
          {
            header: "Order",
            sortKey: "order",
            cell: (row) => (
              <Link href={`/admin/orders/${row.id}`} className="font-medium text-primary hover:underline">
                #{row.orderNumber}
              </Link>
            ),
          },
          {
            header: "Customer",
            cell: (row) => (
              <div>
                <p className="font-medium">{row.userName}</p>
                <p className="text-xs text-muted-foreground">{row.userEmail}</p>
              </div>
            ),
          },
          {
            header: "Total",
            sortKey: "total",
            cell: (row) => formatCurrency(row.totalCost as number, sym),
          },
          {
            header: "Status",
            cell: (row) => (
              <Badge variant={statusVariants[row.status as keyof typeof statusVariants]}>
                {row.status as string}
              </Badge>
            ),
          },
          {
            header: "Date",
            sortKey: "date",
            cell: (row) => (
              <span className="text-muted-foreground">
                {new Date(row.createdAt as unknown as string).toLocaleDateString()}
              </span>
            ),
          },
        ]}
        data={allOrders}
        emptyMessage="No orders yet"
        currentPage={page}
        totalPages={totalPages(total, pageSize)}
        currentSort={sort}
        currentOrder={order}
        baseParams={baseParams}
      />
    </div>
  );
}
