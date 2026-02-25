import { eq, and, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import {
  items,
  categories,
  itemOptionGroups,
  itemOptionValues,
  itemVariants,
} from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { ItemForm } from "@/components/admin/item-form";
import type { OptionGroupData, VariantData } from "@/components/admin/item-form";
import { updateItem } from "../../actions";
import { getSignedUrl } from "@/lib/storage/supabase";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const org = await getResolvedTenant();

  const item = await withTenant(org.id, async (tx) => {
    const [found] = await tx
      .select()
      .from(items)
      .where(and(eq(items.id, id), eq(items.tenantId, org.id)));
    return found;
  });

  if (!item) notFound();

  const allCategories = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(categories)
      .where(eq(categories.tenantId, org.id))
      .orderBy(categories.sortOrder);
  });

  // Resolve signed URLs for existing images
  const imagePaths = (item.imageUrls as string[]) ?? [];
  const existingImages = await Promise.all(
    imagePaths.map(async (path) => ({
      path,
      signedUrl: await getSignedUrl(path),
    }))
  );

  // Load option groups + values
  const optionGroupRows = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(itemOptionGroups)
      .where(
        and(
          eq(itemOptionGroups.itemId, id),
          eq(itemOptionGroups.tenantId, org.id)
        )
      )
      .orderBy(asc(itemOptionGroups.sortOrder));
  });

  const initialOptionGroups: OptionGroupData[] = [];
  for (const group of optionGroupRows) {
    const valueRows = await withTenant(org.id, async (tx) => {
      return tx
        .select()
        .from(itemOptionValues)
        .where(eq(itemOptionValues.optionGroupId, group.id))
        .orderBy(asc(itemOptionValues.sortOrder));
    });
    initialOptionGroups.push({
      name: group.name,
      values: valueRows.map((v) => v.value),
    });
  }

  // Load variants
  const variantRows = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(itemVariants)
      .where(
        and(
          eq(itemVariants.itemId, id),
          eq(itemVariants.tenantId, org.id)
        )
      );
  });

  const initialVariants: VariantData[] = variantRows.map((v) => ({
    options: v.options as Record<string, string>,
    stockQuantity: v.stockQuantity,
    priceOverride: v.priceOverride,
  }));

  async function handleUpdate(formData: FormData) {
    "use server";
    return updateItem(id, formData);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Item</h1>
        <p className="text-sm text-muted-foreground">
          Update {item.name}
        </p>
      </div>
      <ItemForm
        item={item}
        categories={allCategories}
        existingImages={existingImages}
        initialOptionGroups={initialOptionGroups.length > 0 ? initialOptionGroups : undefined}
        initialVariants={initialVariants.length > 0 ? initialVariants : undefined}
        action={handleUpdate}
      />
    </div>
  );
}
