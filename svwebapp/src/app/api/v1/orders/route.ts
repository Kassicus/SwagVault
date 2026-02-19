import { eq, and, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { orders, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiPaginated } from "@/lib/api/response";
import { paginationOffset } from "@/lib/db/pagination";
import { paginationSchema } from "@/lib/validators/api";

export const GET = withApiHandler(async (req, ctx) => {
  requirePermission(ctx.permissions, "orders:read");

  const url = new URL(req.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const status = url.searchParams.get("status");

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const conditions = [eq(orders.tenantId, ctx.tenantId)];
    if (status) {
      conditions.push(
        eq(orders.status, status as "pending" | "approved" | "fulfilled" | "cancelled")
      );
    }
    const where = and(...conditions);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(orders)
      .where(where);

    const rows = await tx
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        userId: orders.userId,
        userEmail: users.email,
        userDisplayName: users.displayName,
        status: orders.status,
        totalCost: orders.totalCost,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(orders.createdAt)
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { rows, total: totalRow?.count ?? 0 };
  });

  return apiPaginated(result.rows, page, pageSize, result.total);
});
