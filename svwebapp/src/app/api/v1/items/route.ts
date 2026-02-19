import { eq, and, ilike, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { items, categories } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiPaginated } from "@/lib/api/response";
import { paginationOffset } from "@/lib/db/pagination";
import { paginationSchema } from "@/lib/validators/api";

export const GET = withApiHandler(async (req, ctx) => {
  requirePermission(ctx.permissions, "items:read");

  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(items.tenantId, ctx.tenantId)];
    if (category) conditions.push(eq(items.categoryId, category));
    if (search) conditions.push(ilike(items.name, `%${search}%`));

    const where = and(...conditions);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(items)
      .where(where);

    const rows = await tx
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
        createdAt: items.createdAt,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .where(where)
      .orderBy(items.sortOrder, items.name)
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { rows, total: totalRow?.count ?? 0 };
  });

  return apiPaginated(result.rows, page, pageSize, result.total);
});
