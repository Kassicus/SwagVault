import { eq, and } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { items, categories } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiSuccess, apiError } from "@/lib/api/response";

export const GET = withApiHandler(async (_req, ctx, params) => {
  requirePermission(ctx.permissions, "items:read");

  const id = params?.id;
  if (!id) return apiError("Item ID required", "BAD_REQUEST", 400);

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const [row] = await tx
      .select({
        id: items.id,
        name: items.name,
        slug: items.slug,
        description: items.description,
        price: items.price,
        categoryId: items.categoryId,
        categoryName: categories.name,
        imageUrls: items.imageUrls,
        stockQuantity: items.stockQuantity,
        isActive: items.isActive,
        sortOrder: items.sortOrder,
        createdAt: items.createdAt,
        updatedAt: items.updatedAt,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(and(eq(items.id, id), eq(items.tenantId, ctx.tenantId)));
    return row;
  });

  if (!result) return apiError("Item not found", "NOT_FOUND", 404);

  return apiSuccess(result);
});
