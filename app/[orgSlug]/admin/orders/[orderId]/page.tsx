import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { OrderActionButtons } from './action-buttons';

export const metadata = { title: 'Order · Admin · SwagVault' };

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; orderId: string }>;
}) {
  const { orgSlug, orderId } = await params;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound();

  const order = data as unknown as OrderRow & { order_items: OrderItemRow[] };

  const { data: buyer } = await service.auth.admin.getUserById(order.user_id);
  const buyerEmail = buyer?.user?.email ?? '(unknown)';

  const productIds = Array.from(
    new Set(
      order.order_items
        .map((i) => i.product_id)
        .filter((x): x is string => !!x),
    ),
  );
  const productImages: Record<string, string | null> = {};
  if (productIds.length > 0) {
    const { data: products } = await service
      .from('products')
      .select('id, image_paths')
      .in('id', productIds);
    for (const p of products ?? []) {
      productImages[p.id] = p.image_paths[0] ?? null;
    }
  }

  const address = order.shipping_address as Record<string, string> | null;
  const statusVariant =
    order.status === 'pending'
      ? 'warn'
      : order.status === 'fulfilled'
        ? 'mint'
        : 'muted';

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          href={`/${orgSlug}/admin/orders`}
          className="label-mono text-muted-foreground hover:text-foreground"
        >
          ← All orders
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-heading text-3xl font-black uppercase tracking-tight">
            Order {order.id.slice(0, 8)}
          </h1>
          <Badge variant={statusVariant}>{order.status}</Badge>
          <Badge variant="outline">
            {order.fulfillment_method === 'shipping' ? 'Shipping' : 'Pickup'}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Placed by <strong className="text-foreground">{buyerEmail}</strong> on{' '}
          {new Date(order.created_at).toLocaleString()}
        </p>
      </div>

      <OrderActionButtons
        slug={orgSlug}
        orderId={order.id}
        status={order.status}
      />

      <section className="space-y-3 border-2 border-foreground bg-card p-5">
        <h2 className="font-heading text-lg font-bold uppercase">Items</h2>
        <ul className="divide-y-2 divide-foreground/10">
          {order.order_items.map((it) => {
            const img = it.product_id ? productImages[it.product_id] : null;
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
          <h2 className="font-heading text-lg font-bold uppercase">
            Shipping address
          </h2>
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
          Pickup at the organization&rsquo;s designated location.
        </section>
      )}
    </div>
  );
}
