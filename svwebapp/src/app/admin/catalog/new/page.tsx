import { eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { categories } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { ItemForm } from "@/components/admin/item-form";
import { createItem } from "../actions";

export default async function NewItemPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const allCategories = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(categories)
      .where(eq(categories.tenantId, org.id))
      .orderBy(categories.sortOrder);
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Add Item</h1>
        <p className="text-sm text-muted-foreground">
          Add a new item to your catalog
        </p>
      </div>
      <ItemForm categories={allCategories} action={createItem} />
    </div>
  );
}
