"use server";

import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { items, orders, orderItems } from "@/lib/db/schema";
import { debitUser } from "@/lib/currency/engine";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { OutOfStockError } from "@/lib/errors";

interface CartLineItem {
  itemId: string;
  quantity: number;
}

export async function placeOrder(lineItems: CartLineItem[]) {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  if (lineItems.length === 0) {
    return { success: false, error: "Cart is empty" };
  }

  try {
    const result = await withTenant(org.id, async (tx) => {
      // 1. Validate items and check stock
      let totalCost = 0;
      const validatedItems: {
        id: string;
        name: string;
        price: number;
        quantity: number;
        stockQuantity: number | null;
      }[] = [];

      for (const line of lineItems) {
        const [item] = await tx
          .select()
          .from(items)
          .where(
            and(
              eq(items.id, line.itemId),
              eq(items.tenantId, org.id),
              eq(items.isActive, true)
            )
          )
          .for("update");

        if (!item) {
          throw new Error(`Item not found: ${line.itemId}`);
        }

        if (
          item.stockQuantity !== null &&
          item.stockQuantity < line.quantity
        ) {
          throw new OutOfStockError(item.name);
        }

        totalCost += item.price * line.quantity;
        validatedItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: line.quantity,
          stockQuantity: item.stockQuantity,
        });
      }

      // 2. Get next order number for this tenant
      const [maxOrder] = await tx
        .select({ max: sql<number>`COALESCE(MAX(${orders.orderNumber}), 0)` })
        .from(orders)
        .where(eq(orders.tenantId, org.id));

      const orderNumber = (maxOrder?.max ?? 0) + 1;

      // 3. Create order
      const [order] = await tx
        .insert(orders)
        .values({
          tenantId: org.id,
          orderNumber,
          userId: user.id,
          status: "pending",
          totalCost,
        })
        .returning({ id: orders.id, orderNumber: orders.orderNumber });

      // 4. Create order items
      for (const vi of validatedItems) {
        await tx.insert(orderItems).values({
          tenantId: org.id,
          orderId: order.id,
          itemId: vi.id,
          itemName: vi.name,
          itemPrice: vi.price,
          quantity: vi.quantity,
        });

        // 5. Decrement stock
        if (vi.stockQuantity !== null) {
          await tx
            .update(items)
            .set({
              stockQuantity: sql`${items.stockQuantity} - ${vi.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(items.id, vi.id));
        }
      }

      return { orderId: order.id, orderNumber: order.orderNumber, totalCost };
    });

    // 6. Debit user balance (in separate withTenant to get proper balance snapshot)
    await debitUser(
      org.id,
      user.id,
      result.totalCost,
      `Order #${result.orderNumber}`,
      user.id,
      { type: "order", id: result.orderId }
    );

    revalidatePath("/orders");
    revalidatePath("/");
    return { success: true, orderId: result.orderId };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to place order" };
  }
}
