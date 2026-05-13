import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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

  // Fetch product images for thumbnails.
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
  const statusBadge = {
    pending: 'bg-amber-100 text-amber-900',
    fulfilled: 'bg-emerald-100 text-emerald-900',
    cancelled: 'bg-zinc-200 text-zinc-700 line-through',
  }[order.status];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/${orgSlug}/admin/orders`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All orders
        </Link>
        <div className="mt-2 flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Order {order.id.slice(0, 8)}
          </h1>
          <span
            className={`inline-block rounded px-2 py-0.5 text-xs ${statusBadge}`}
          >
            {order.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed by <strong>{buyerEmail}</strong> on{' '}
          {new Date(order.created_at).toLocaleString()} ·{' '}
          {order.fulfillment_method === 'shipping' ? 'Shipping' : 'Pickup'}
        </p>
      </div>

      <OrderActionButtons
        slug={orgSlug}
        orderId={order.id}
        status={order.status}
      />

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Items</h2>
        <ul className="divide-y">
          {order.order_items.map((it) => {
            const img = it.product_id ? productImages[it.product_id] : null;
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
          <h2 className="text-sm font-medium">Shipping address</h2>
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
          Pickup at the organization&rsquo;s designated location.
        </section>
      )}
    </div>
  );
}
