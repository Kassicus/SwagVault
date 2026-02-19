import Link from "next/link";
import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { items } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { ItemActiveToggle } from "@/components/admin/item-active-toggle";

export default async function CatalogPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const allItems = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(items)
      .where(eq(items.tenantId, org.id))
      .orderBy(items.sortOrder, items.createdAt);
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store items
          </p>
        </div>
        <Link href="/admin/catalog/new">
          <Button>Add Item</Button>
        </Link>
      </div>

      {allItems.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center">
          <p className="text-muted-foreground">No items yet</p>
          <Link href="/admin/catalog/new">
            <Button variant="outline" className="mt-4">
              Add your first item
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Price
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Stock
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    {formatCurrency(item.price, org.currencySymbol ?? "C")}
                  </td>
                  <td className="px-4 py-3">
                    {item.stockQuantity === null ? (
                      <span className="text-muted-foreground">Unlimited</span>
                    ) : item.stockQuantity === 0 ? (
                      <Badge variant="destructive">Out of stock</Badge>
                    ) : (
                      item.stockQuantity
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ItemActiveToggle
                      itemId={item.id}
                      isActive={item.isActive}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/catalog/${item.id}/edit`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
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
