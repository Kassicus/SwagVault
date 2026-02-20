"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { items, categories } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { createItemSchema, updateItemSchema } from "@/lib/validators/items";
import { slugify } from "@/lib/utils";
import { checkPlanLimit } from "@/lib/stripe/enforce";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { logAuditEvent } from "@/lib/audit/log";
import { dispatchIntegrationNotifications } from "@/lib/integrations/dispatch";
import { uploadItemImage, deleteFile } from "@/lib/storage/supabase";

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

  // Insert item first (without images) to get the ID
  const result = await withTenant(org.id, async (tx) => {
    const [item] = await tx
      .insert(items)
      .values({
        ...parsed.data,
        tenantId: org.id,
        imageUrls: [],
      })
      .returning({ id: items.id, slug: items.slug });
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

  await withTenant(org.id, async (tx) => {
    await tx
      .update(items)
      .set({
        ...parsed.data,
        imageUrls: combinedPaths,
        updatedAt: new Date(),
      })
      .where(and(eq(items.id, itemId), eq(items.tenantId, org.id)));
  });

  // Audit + webhook + integrations (non-blocking)
  logAuditEvent({ tenantId: org.id, userId: user.id, action: "item.updated", resourceType: "item", resourceId: itemId });
  dispatchWebhookEvent(org.id, WEBHOOK_EVENTS.ITEM_UPDATED, { itemId });
  dispatchIntegrationNotifications(org.id, WEBHOOK_EVENTS.ITEM_UPDATED, { itemId });

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
