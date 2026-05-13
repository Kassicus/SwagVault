import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
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

  const statusVariant =
    order.status === 'pending'
      ? 'warn'
      : order.status === 'fulfilled'
        ? 'mint'
        : 'muted';

  return (
    <div className="max-w-2xl space-y-6">
      {just_placed ? (
        <div className="border-2 border-mint bg-mint/15 px-4 py-3 font-bold text-mint">
          ✓ Order placed — confirmation sent to your email.
        </div>
      ) : null}

      <div className="space-y-2">
        <Link
          href={`/${orgSlug}/orders`}
          className="label-mono text-muted-foreground hover:text-foreground"
        >
          ← All orders
        </Link>
        <h1 className="font-heading text-3xl font-black uppercase tracking-tight">
          Order {order.id.slice(0, 8)}
        </h1>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant={statusVariant}>{order.status}</Badge>
          <Badge variant="outline">
            {order.fulfillment_method === 'shipping' ? 'Shipping' : 'Pickup'}
          </Badge>
          <span className="label-mono text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </span>
        </div>
      </div>

      <section className="space-y-4 border-2 border-foreground bg-card p-5">
        <h2 className="font-heading text-lg font-bold uppercase">Items</h2>
        <ul className="divide-y-2 divide-foreground/10">
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
                <div className="relative h-14 w-14 shrink-0 overflow-hidden border-2 border-foreground bg-muted">
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
                  <div className="font-heading font-bold uppercase text-xs">
                    {it.product_name}
                  </div>
                  {variantLabel ? (
                    <div className="label-mono text-muted-foreground">
                      {variantLabel}
                    </div>
                  ) : null}
                  <div className="label-mono text-muted-foreground">× {it.qty}</div>
                </div>
                <div className="font-heading text-sm font-bold tabular-nums">
                  <Money
                    amount={it.unit_price_minor_units * it.qty}
                    currency={currency}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
          <span className="label-mono">Total</span>
          <span className="font-heading text-2xl font-black tabular-nums">
            <Money amount={order.total_minor_units} currency={currency} />
          </span>
        </div>
      </section>

      {address ? (
        <section className="space-y-3 border-2 border-foreground bg-card p-5 text-sm">
          <h2 className="font-heading text-lg font-bold uppercase">Shipping to</h2>
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
        <section className="border-2 border-foreground bg-card p-5 text-sm text-muted-foreground">
          Pickup at your organization&rsquo;s designated location.
        </section>
      )}
    </div>
  );
}
