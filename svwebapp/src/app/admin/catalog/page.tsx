import Link from "next/link";
import { eq, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { items } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { ItemActiveToggle } from "@/components/admin/item-active-toggle";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);

  const { data: allItems, total } = await withTenant(org.id, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(items)
      .where(eq(items.tenantId, org.id));

    const data = await tx
      .select()
      .from(items)
      .where(eq(items.tenantId, org.id))
      .orderBy(items.sortOrder, items.createdAt)
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { data, total: countResult?.count ?? 0 };
  });

  const sym = org.currencySymbol ?? "C";
  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store items ({total} total)
          </p>
        </div>
        <Link href="/admin/catalog/new">
          <Button>Add Item</Button>
        </Link>
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (row) => <span className="font-medium">{row.name as string}</span> },
          { header: "Price", cell: (row) => formatCurrency(row.price as number, sym) },
          {
            header: "Stock",
            cell: (row) =>
              row.stockQuantity === null ? (
                <span className="text-muted-foreground">Unlimited</span>
              ) : row.stockQuantity === 0 ? (
                <Badge variant="destructive">Out of stock</Badge>
              ) : (
                row.stockQuantity as number
              ),
          },
          {
            header: "Status",
            cell: (row) => (
              <ItemActiveToggle itemId={row.id as string} isActive={row.isActive as boolean} />
            ),
          },
          {
            header: "Actions",
            className: "text-right",
            cell: (row) => (
              <Link href={`/admin/catalog/${row.id}/edit`} className="text-sm text-primary hover:underline">
                Edit
              </Link>
            ),
          },
        ]}
        data={allItems}
        emptyMessage="No items yet"
        currentPage={page}
        totalPages={totalPages(total, pageSize)}
        baseParams={baseParams}
      />
    </div>
  );
}
