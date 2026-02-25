"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import {
  items,
  categories,
  itemOptionGroups,
  itemOptionValues,
  itemVariants,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import {
  createItemSchema,
  updateItemSchema,
  itemOptionsSchema,
} from "@/lib/validators/items";
import { slugify } from "@/lib/utils";
import { checkPlanLimit } from "@/lib/stripe/enforce";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { logAuditEvent } from "@/lib/audit/log";
import { dispatchIntegrationNotifications } from "@/lib/integrations/dispatch";
import { uploadItemImage, deleteFile } from "@/lib/storage/supabase";

// ─── Helpers ────────────────────────────────────────────────────

async function insertOptionGroupsAndVariants(
  tx: Parameters<Parameters<typeof withTenant>[1]>[0],
  tenantId: string,
  itemId: string,
  optionGroupsData: { name: string; values: string[] }[],
  variantsData: {
    options: Record<string, string>;
    stockQuantity?: number | null;
    priceOverride?: number | null;
  }[]
) {
  for (let i = 0; i < optionGroupsData.length; i++) {
    const group = optionGroupsData[i];
    const [inserted] = await tx
      .insert(itemOptionGroups)
      .values({
        tenantId,
        itemId,
        name: group.name,
        sortOrder: i,
      })
      .returning({ id: itemOptionGroups.id });

    for (let j = 0; j < group.values.length; j++) {
      await tx.insert(itemOptionValues).values({
        tenantId,
        optionGroupId: inserted.id,
        value: group.values[j],
        sortOrder: j,
      });
    }
  }

  for (const variant of variantsData) {
    await tx.insert(itemVariants).values({
      tenantId,
      itemId,
      options: variant.options,
      stockQuantity: variant.stockQuantity ?? null,
      priceOverride: variant.priceOverride ?? null,
    });
  }
}

// ─── Create Item ────────────────────────────────────────────────

export async function createItem(formData: FormData) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  // Check plan item limit
  const itemCheck = await checkPlanLimit(org.id, "items");
  if (!itemCheck.allowed) {
    return {
      success: false,
      error: `Item limit reached (${itemCheck.current}/${itemCheck.limit}). Upgrade your plan to add more items.`,
    };
  }

  const raw = {
    name: formData.get("name") as string,
    slug: slugify(formData.get("name") as string),
    description: (formData.get("description") as string) || undefined,
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

  // Parse option groups + variants (if present)
  const optionGroupsRaw = formData.get("optionGroups") as string | null;
  const variantsRaw = formData.get("variants") as string | null;
  let optionsData: { optionGroups: { name: string; values: string[] }[]; variants: { options: Record<string, string>; stockQuantity?: number | null; priceOverride?: number | null }[] } | null = null;

  if (optionGroupsRaw && variantsRaw) {
    const optionsParsed = itemOptionsSchema.safeParse({
      optionGroups: JSON.parse(optionGroupsRaw),
      variants: JSON.parse(variantsRaw),
    });
    if (!optionsParsed.success) {
      return { success: false, error: optionsParsed.error.issues[0].message };
    }
    optionsData = optionsParsed.data;
  }

  // If item has variants, stock lives on variants — set item stock to null
  const itemStockQuantity = optionsData ? null : parsed.data.stockQuantity;

  // Insert item first (without images) to get the ID
  const result = await withTenant(org.id, async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        ...parsed.data,
        stockQuantity: itemStockQuantity,
        tenantId: org.id,
        imageUrls: [],
      })
      .returning({ id: items.id, slug: items.slug });

    // Insert option groups + variants
    if (optionsData) {
      await insertOptionGroupsAndVariants(
        tx,
        org.id,
        item.id,
        optionsData.optionGroups,
        optionsData.variants
      );
    }

    return item;
  });

  // Upload new images
  const newFiles = formData.getAll("newImages") as File[];
  const uploadedPaths: string[] = [];
  for (const file of newFiles) {
    if (file.size > 0) {
      const path = await uploadItemImage(org.id, result.id, file);
      uploadedPaths.push(path);
    }
  }

  // Update item with image paths if any were uploaded
  if (uploadedPaths.length > 0) {
    await withTenant(org.id, async (tx) => {
      await tx
        .update(items)
        .set({ imageUrls: uploadedPaths })
        .where(and(eq(items.id, result.id), eq(items.tenantId, org.id)));
    });
  }

  // Audit + webhook + integrations (non-blocking)
  logAuditEvent({ tenantId: org.id, userId: user.id, action: "item.created", resourceType: "item", resourceId: result.id });
  dispatchWebhookEvent(org.id, WEBHOOK_EVENTS.ITEM_CREATED, { itemId: result.id, slug: result.slug });
  dispatchIntegrationNotifications(org.id, WEBHOOK_EVENTS.ITEM_CREATED, { itemId: result.id, slug: result.slug });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true, item: result };
}

// ─── Update Item ────────────────────────────────────────────────

export async function updateItem(itemId: string, formData: FormData) {
  const user = await requireAuth();
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

  // Parse option groups + variants (if present)
  const optionGroupsRaw = formData.get("optionGroups") as string | null;
  const variantsRaw = formData.get("variants") as string | null;
  let optionsData: { optionGroups: { name: string; values: string[] }[]; variants: { options: Record<string, string>; stockQuantity?: number | null; priceOverride?: number | null }[] } | null = null;

  if (optionGroupsRaw && variantsRaw) {
    const optionsParsed = itemOptionsSchema.safeParse({
      optionGroups: JSON.parse(optionGroupsRaw),
      variants: JSON.parse(variantsRaw),
    });
    if (!optionsParsed.success) {
      return { success: false, error: optionsParsed.error.issues[0].message };
    }
    optionsData = optionsParsed.data;
  }

  // Get existing image paths from the form and current item
  const existingImagePathsRaw = formData.get("existingImagePaths") as string;
  const keptPaths: string[] = existingImagePathsRaw ? JSON.parse(existingImagePathsRaw) : [];

  // Upload new images
  const newFiles = formData.getAll("newImages") as File[];
  const newPaths: string[] = [];
  for (const file of newFiles) {
    if (file.size > 0) {
      const path = await uploadItemImage(org.id, itemId, file);
      newPaths.push(path);
    }
  }

  const combinedPaths = [...keptPaths, ...newPaths];

  // Fetch current item to find removed images
  const currentItem = await withTenant(org.id, async (tx) => {
    const [found] = await tx
      .select({ imageUrls: items.imageUrls })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
    return found;
  });

  // Delete removed images from storage (best-effort)
  if (currentItem?.imageUrls) {
    const currentPaths = currentItem.imageUrls as string[];
    const removedPaths = currentPaths.filter((p) => !keptPaths.includes(p));
    for (const path of removedPaths) {
      try {
        await deleteFile(path);
      } catch {
        // best-effort cleanup
      }
    }
  }

  // If has variants, set item stock to null (stock lives on variants)
  if (optionsData) {
    parsed.data.stockQuantity = null;
  }

  await withTenant(org.id, async (tx) => {
    await tx
      .update(items)
      .set({
        ...parsed.data,
        imageUrls: combinedPaths,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));

    // Replace option groups + variants (delete-then-reinsert)
    if (optionsData) {
      // Delete existing option groups (cascades to values)
      await tx
        .delete(itemOptionGroups)
        .where(
          and(
            eq(itemOptionGroups.itemId, itemId),
            eq(itemOptionGroups.tenantId, org.id)
          )
        );

      // Delete existing variants
      await tx
        .delete(itemVariants)
        .where(
          and(
            eq(itemVariants.itemId, itemId),
            eq(itemVariants.tenantId, org.id)
          )
        );

      // Re-insert
      await insertOptionGroupsAndVariants(
        tx,
        org.id,
        itemId,
        optionsData.optionGroups,
        optionsData.variants
      );
    } else if (optionGroupsRaw === null && variantsRaw === null) {
      // No options data sent — form had no options section, leave as-is
    } else {
      // Options were explicitly cleared (empty arrays sent)
      // Clean up existing option groups + variants
      await tx
        .delete(itemOptionGroups)
        .where(
          and(
            eq(itemOptionGroups.itemId, itemId),
            eq(itemOptionGroups.tenantId, org.id)
          )
        );
      await tx
        .delete(itemVariants)
        .where(
          and(
            eq(itemVariants.itemId, itemId),
            eq(itemVariants.tenantId, org.id)
          )
        );
    }
  });

  // Audit + webhook + integrations (non-blocking)
  logAuditEvent({ tenantId: org.id, userId: user.id, action: "item.updated", resourceType: "item", resourceId: itemId });
  dispatchWebhookEvent(org.id, WEBHOOK_EVENTS.ITEM_UPDATED, { itemId });
  dispatchIntegrationNotifications(org.id, WEBHOOK_EVENTS.ITEM_UPDATED, { itemId });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true };
}

// ─── Toggle Active ──────────────────────────────────────────────

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

// ─── Delete Item ────────────────────────────────────────────────

export async function deleteItem(itemId: string) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  // Fetch item's images before deletion
  const currentItem = await withTenant(org.id, async (tx) => {
    const [found] = await tx
      .select({ imageUrls: items.imageUrls })
      .from(items)
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
    return found;
  });

  await withTenant(org.id, async (tx) => {
    await tx
      .delete(items)
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
  });

  // Clean up images from storage (best-effort)
  if (currentItem?.imageUrls) {
    const paths = currentItem.imageUrls as string[];
    for (const path of paths) {
      try {
        await deleteFile(path);
      } catch {
        // best-effort cleanup
      }
    }
  }

  logAuditEvent({ tenantId: org.id, userId: user.id, action: "item.deleted", resourceType: "item", resourceId: itemId });

  revalidatePath("/admin/catalog");
  revalidatePath("/");
  return { success: true };
}

// ─── Create Category ────────────────────────────────────────────

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
