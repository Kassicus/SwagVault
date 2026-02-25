import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { orders, orderItems } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const statusVariants = {
  pending: "warning",
  approved: "default",
  fulfilled: "success",
  cancelled: "destructive",
} as const;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const { order, items: lineItems } = await withTenant(org.id, async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, id),
          eq(orders.tenantId, org.id),
          eq(orders.userId, user.id)
        )
      );

    if (!order) return { order: null, items: [] };

    const lineItems = await tx
      .select()
      .from(orderItems)
      .where(
        and(eq(orderItems.orderId, id), eq(orderItems.tenantId, org.id))
      );

    return { order, items: lineItems };
  });

  if (!order) notFound();

  const sym = org.currencySymbol ?? "C";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/orders"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to orders
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Order #{order.orderNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
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
          {lineItems.map((item) => {
            const opts = item.selectedOptions as Record<string, string> | null;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{item.itemName}</p>
                  {opts && Object.keys(opts).length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {Object.entries(opts)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" / ")}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.itemPrice, sym)} x {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  {formatCurrency(item.itemPrice * item.quantity, sym)}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(order.totalCost, sym)}
          </p>
        </div>
      </div>

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
    </div>
  );
}
