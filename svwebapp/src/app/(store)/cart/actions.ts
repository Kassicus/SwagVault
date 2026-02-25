"use server";

import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db/tenant";
import { items, orders, orderItems, itemVariants } from "@/lib/db/schema";
import { debitUser } from "@/lib/currency/engine";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { OutOfStockError } from "@/lib/errors";
import { sendEmail } from "@/lib/email/client";
import { orderConfirmationHtml } from "@/lib/email/templates/order-confirmation";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import { WEBHOOK_EVENTS } from "@/lib/webhooks/events";
import { dispatchIntegrationNotifications } from "@/lib/integrations/dispatch";

interface CartLineItem {
  itemId: string;
  variantId?: string;
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
        variantId: string | null;
        selectedOptions: Record<string, string> | null;
        variantStockQuantity: number | null;
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

        let effectivePrice = item.price;
        let effectiveStock = item.stockQuantity;
        let variantId: string | null = null;
        let selectedOptions: Record<string, string> | null = null;
        let variantStockQuantity: number | null = null;

        if (line.variantId) {
          // Lock and validate variant
          const [variant] = await tx
            .select()
            .from(itemVariants)
            .where(
              and(
                eq(itemVariants.id, line.variantId),
                eq(itemVariants.itemId, line.itemId),
                eq(itemVariants.tenantId, org.id),
                eq(itemVariants.isActive, true)
              )
            )
            .for("update");

          if (!variant) {
            throw new Error(`Variant not found for item: ${item.name}`);
          }

          effectivePrice = variant.priceOverride ?? item.price;
          effectiveStock = variant.stockQuantity;
          variantStockQuantity = variant.stockQuantity;
          variantId = variant.id;
          selectedOptions = variant.options as Record<string, string>;

          if (effectiveStock !== null && effectiveStock < line.quantity) {
            throw new OutOfStockError(
              `${item.name} (${Object.values(selectedOptions).join(" / ")})`
            );
          }
        } else {
          // Simple item (no variant)
          if (
            item.stockQuantity !== null &&
            item.stockQuantity < line.quantity
          ) {
            throw new OutOfStockError(item.name);
          }
        }

        totalCost += effectivePrice * line.quantity;
        validatedItems.push({
          id: item.id,
          name: item.name,
          price: effectivePrice,
          quantity: line.quantity,
          stockQuantity: item.stockQuantity,
          variantId,
          selectedOptions,
          variantStockQuantity,
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

      // 4. Create order items + decrement stock
      for (const vi of validatedItems) {
        await tx.insert(orderItems).values({
          tenantId: org.id,
          orderId: order.id,
          itemId: vi.id,
          variantId: vi.variantId,
          itemName: vi.name,
          itemPrice: vi.price,
          selectedOptions: vi.selectedOptions,
          quantity: vi.quantity,
        });

        // 5. Decrement stock on variant or item
        if (vi.variantId && vi.variantStockQuantity !== null) {
          await tx
            .update(itemVariants)
            .set({
              stockQuantity: sql`${itemVariants.stockQuantity} - ${vi.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(itemVariants.id, vi.variantId));
        } else if (!vi.variantId && vi.stockQuantity !== null) {
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

    // Dispatch webhook + integrations (non-blocking)
    const eventPayload = { orderId: result.orderId, orderNumber: result.orderNumber, userId: user.id, totalCost: result.totalCost };
    dispatchWebhookEvent(org.id, WEBHOOK_EVENTS.ORDER_CREATED, eventPayload);
    dispatchIntegrationNotifications(org.id, WEBHOOK_EVENTS.ORDER_CREATED, eventPayload);

    // Send order confirmation email (non-blocking)
    try {
      await sendEmail({
        to: user.email,
        subject: `Order #${result.orderNumber} confirmed - ${org.name}`,
        html: orderConfirmationHtml({
          orgName: org.name,
          orderNumber: result.orderNumber,
          totalCost: result.totalCost,
          currencySymbol: org.currencySymbol ?? "C",
          itemCount: lineItems.length,
        }),
      });
    } catch {
      // Email failure shouldn't block the order
    }

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
