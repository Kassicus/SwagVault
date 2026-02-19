"use server";

import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { orders, orderItems, items } from "@/lib/db/schema";
import { creditUser } from "@/lib/currency/engine";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";

export async function updateOrderStatus(
  orderId: string,
  newStatus: "approved" | "fulfilled" | "cancelled"
) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  try {
    await withTenant(org.id, async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.tenantId, org.id)))
        .for("update");

      if (!order) throw new Error("Order not found");

      // Validate transitions
      const validTransitions: Record<string, string[]> = {
        pending: ["approved", "cancelled"],
        approved: ["fulfilled", "cancelled"],
      };

      if (!validTransitions[order.status]?.includes(newStatus)) {
        throw new Error(
          `Cannot transition from ${order.status} to ${newStatus}`
        );
      }

      // If cancelling, refund and restore stock
      if (newStatus === "cancelled") {
        // Get order items to restore stock
        const lineItems = await tx
          .select()
          .from(orderItems)
          .where(
            and(
              eq(orderItems.orderId, orderId),
              eq(orderItems.tenantId, org.id)
            )
          );

        // Restore stock for each item
        for (const li of lineItems) {
          const [item] = await tx
            .select({ stockQuantity: items.stockQuantity })
            .from(items)
            .where(eq(items.id, li.itemId));

          if (item && item.stockQuantity !== null) {
            await tx
              .update(items)
              .set({
                stockQuantity: sql`${items.stockQuantity} + ${li.quantity}`,
                updatedAt: new Date(),
              })
              .where(eq(items.id, li.itemId));
          }
        }

        // Refund via currency engine (outside this tx, uses its own withTenant)
        await tx
          .update(orders)
          .set({ status: newStatus, notes: "Cancelled and refunded", updatedAt: new Date() })
          .where(eq(orders.id, orderId));

        // Credit will happen outside the transaction below
      } else {
        await tx
          .update(orders)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(orders.id, orderId));
      }
    });

    // If cancelled, credit the refund
    if (newStatus === "cancelled") {
      const [order] = await withTenant(org.id, async (tx) => {
        return tx
          .select()
          .from(orders)
          .where(and(eq(orders.id, orderId), eq(orders.tenantId, org.id)));
      });

      if (order) {
        await creditUser(
          org.id,
          order.userId,
          order.totalCost,
          `Refund for cancelled Order #${order.orderNumber}`,
          user.id,
          { type: "order_refund", id: orderId }
        );
      }
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update order",
    };
  }
}
