import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import { orders, orderItems, users } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { OrderActions } from "@/components/admin/order-actions";

const statusVariants = {
  pending: "warning",
  approved: "default",
  fulfilled: "success",
  cancelled: "destructive",
} as const;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const org = await getResolvedTenant();

  const data = await withTenant(org.id, async (tx) => {
    const [order] = await tx
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalCost: orders.totalCost,
        notes: orders.notes,
        createdAt: orders.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(eq(orders.id, id), eq(orders.tenantId, org.id)));

    if (!order) return null;

    const lineItems = await tx
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.orderId, id), eq(orderItems.tenantId, org.id))
      );

    return { order, lineItems };
  });

  if (!data) notFound();

  const { order, lineItems } = data;
  const sym = org.currencySymbol ?? "C";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {order.userName} ({order.userEmail}) &middot;{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge variant={statusVariants[order.status]} className="text-sm">
          {order.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {lineItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{item.itemName}</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(item.itemPrice, sym)} x {item.quantity}
                </p>
              </div>
              <p className="font-medium">
                {formatCurrency(item.itemPrice * item.quantity, sym)}
              </p>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 font-bold">
            <span>Total</span>
            <span className="text-primary">
              {formatCurrency(order.totalCost, sym)}
            </span>
          </div>
        </CardContent>
      </Card>

      {order.notes && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      <OrderActions orderId={order.id} status={order.status} />
    </div>
  );
}
