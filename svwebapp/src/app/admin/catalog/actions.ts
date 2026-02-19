"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { items, categories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { createItemSchema, updateItemSchema } from "@/lib/validators/items";
import { slugify } from "@/lib/utils";

export async function createItem(formData: FormData) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const raw = {
    name: formData.get("name") as string,
    slug: slugify(formData.get("name") as string),
    description: formData.get("description") as string || undefined,
    price: Number(formData.get("price")),
    categoryId: (formData.get("categoryId") as string) || null,
    stockQuantity: formData.get("stockQuantity")
      ? Number(formData.get("stockQuantity"))
      : null,
    isActive: formData.get("isActive") !== "false",
  };

  const parsed = createItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const imageUrlsRaw = formData.get("imageUrls") as string;
  const imageUrls = imageUrlsRaw ? JSON.parse(imageUrlsRaw) : [];

  const result = await withTenant(org.id, async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        ...parsed.data,
        tenantId: org.id,
        imageUrls,
      })
      .returning({ id: items.id, slug: items.slug });
    return item;
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true, item: result };
}

export async function updateItem(itemId: string, formData: FormData) {
  await requireAuth();
  const org = await getResolvedTenant();

  const raw: Record<string, unknown> = {};
  const name = formData.get("name") as string;
  if (name) {
    raw.name = name;
    raw.slug = slugify(name);
  }
  const description = formData.get("description");
  if (description !== null) raw.description = description as string;
  const price = formData.get("price");
  if (price !== null) raw.price = Number(price);
  const categoryId = formData.get("categoryId");
  if (categoryId !== null) raw.categoryId = (categoryId as string) || null;
  const stockQuantity = formData.get("stockQuantity");
  if (stockQuantity !== null) {
    raw.stockQuantity = stockQuantity ? Number(stockQuantity) : null;
  }
  const isActive = formData.get("isActive");
  if (isActive !== null) raw.isActive = isActive === "true";

  const parsed = updateItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const imageUrlsRaw = formData.get("imageUrls") as string;
  const imageUrls = imageUrlsRaw ? JSON.parse(imageUrlsRaw) : undefined;

  await withTenant(org.id, async (tx) => {
    await tx
      .update(items)
      .set({
        ...parsed.data,
        ...(imageUrls !== undefined ? { imageUrls } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true };
}

export async function toggleItemActive(itemId: string, isActive: boolean) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .update(items)
      .set({ isActive, updatedAt: new Date() })
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true };
}

export async function deleteItem(itemId: string) {
  await requireAuth();
  const org = await getResolvedTenant();

  await withTenant(org.id, async (tx) => {
    await tx
      .delete(items)
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true };
}

export async function createCategory(formData: FormData) {
  await requireAuth();
  const org = await getResolvedTenant();

  const name = formData.get("name") as string;
  const slug = slugify(name);

  const result = await withTenant(org.id, async (tx) => {
    const [cat] = await tx
      .insert(categories)
      .values({ tenantId: org.id, name, slug })
      .returning({ id: categories.id });
    return cat;
  });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true, category: result };
}
