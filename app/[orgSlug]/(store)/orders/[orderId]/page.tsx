import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { getOrder } from '@/lib/orders/server';

export const metadata = { title: 'Order · SwagVault' };

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; orderId: string }>;
  searchParams: Promise<{ just_placed?: string }>;
}) {
  const { orgSlug, orderId } = await params;
  const { just_placed } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const [order, currency] = await Promise.all([
    getOrder(ctx.organizationId, orderId, ctx.userId),
    getOrgCurrency(ctx.organizationId),
  ]);
  if (!order) notFound();

  const address = order.shipping_address as Record<string, string> | null;

  return (
    <div className="max-w-2xl space-y-6">
      {just_placed ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Order placed — we sent a confirmation to your email.
        </div>
      ) : null}

      <div className="space-y-1">
        <Link
          href={`/${orgSlug}/orders`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All orders
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Order {order.id.slice(0, 8)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleString()} · {order.status} ·{' '}
          {order.fulfillment_method === 'shipping' ? 'Shipping' : 'Pickup'}
        </p>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Items</h2>
        <ul className="divide-y">
          {order.items.map((it) => {
            const img = it.product_id
              ? order.product_image_paths[it.product_id]
              : null;
            const variantLabel =
              it.variant_name && it.variant_name !== 'default'
                ? it.variant_name
                : null;
            return (
              <li key={it.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted/30">
                  {img ? (
                    <Image
                      src={img}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{it.product_name}</div>
                  {variantLabel ? (
                    <div className="text-xs text-muted-foreground">
                      {variantLabel}
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">× {it.qty}</div>
                </div>
                <div className="text-sm font-medium tabular-nums">
                  <Money
                    amount={it.unit_price_minor_units * it.qty}
                    currency={currency}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t pt-3 text-sm font-medium">
          <span>Total</span>
          <Money amount={order.total_minor_units} currency={currency} />
        </div>
      </section>

      {address ? (
        <section className="space-y-2 rounded-lg border p-4 text-sm">
          <h2 className="text-sm font-medium">Shipping to</h2>
          <address className="not-italic text-muted-foreground">
            {address.recipient ? <div>{address.recipient}</div> : null}
            <div>{address.line1}</div>
            {address.line2 ? <div>{address.line2}</div> : null}
            <div>
              {[address.city, address.region, address.postal_code]
                .filter(Boolean)
                .join(', ')}
            </div>
            {address.country ? <div>{address.country}</div> : null}
          </address>
        </section>
      ) : (
        <section className="rounded-lg border p-4 text-sm text-muted-foreground">
          Pickup at your organization&rsquo;s designated location.
        </section>
      )}
    </div>
  );
}
