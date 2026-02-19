import { eq, and } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { orders, orderItems, users } from "@/lib/db/schema";
import { requirePermission } from "@/lib/api/auth";
import { withApiHandler, apiSuccess, apiError } from "@/lib/api/response";

export const GET = withApiHandler(async (_req, ctx, params) => {
  requirePermission(ctx.permissions, "orders:read");

  const id = params?.id;
  if (!id) return apiError("Order ID required", "BAD_REQUEST", 400);

  const result = await withTenant(ctx.tenantId, async (tx) => {
    const [order] = await tx
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
      .where(and(eq(orders.id, id), eq(orders.tenantId, ctx.tenantId)));

    if (!order) return null;

    const lineItems = await tx
      .select({
        id: orderItems.id,
        itemId: orderItems.itemId,
        itemName: orderItems.itemName,
        itemPrice: orderItems.itemPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.orderId, id),
          eq(orderItems.tenantId, ctx.tenantId)
        )
      );

    return { ...order, lineItems };
  });

  if (!result) return apiError("Order not found", "NOT_FOUND", 404);

  return apiSuccess(result);
});
