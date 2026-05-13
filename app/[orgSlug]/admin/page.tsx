import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

type Aggregated = {
  productId: string | null;
  productName: string;
  qty: number;
  revenueMinorUnits: number;
};

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const service = createSupabaseServiceClient();

  const [
    spendRes,
    balanceRes,
    pendingRes,
    memberRes,
    activeProductRes,
    topItemsRes,
  ] = await Promise.all([
    // Total spend: sum of |amount| where kind='spend'
    service
      .from('transactions')
      .select('amount_minor_units')
      .eq('organization_id', ctx.organizationId)
      .eq('kind', 'spend'),
    // Outstanding balance: sum of memberships.balance
    service
      .from('memberships')
      .select('balance_minor_units')
      .eq('organization_id', ctx.organizationId),
    // Pending orders count
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'pending'),
    // Member count
    service
      .from('memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId),
    // Active product count
    service
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('active', true),
    // Top products: fetch non-cancelled order items joined to orders, aggregate in JS.
    service
      .from('order_items')
      .select(
        'product_id, product_name, qty, unit_price_minor_units, orders!inner(organization_id, status)',
      )
      .eq('orders.organization_id', ctx.organizationId)
      .neq('orders.status', 'cancelled')
      .limit(2000),
  ]);

  const totalSpend = -(spendRes.data ?? []).reduce(
    (s, r) => s + (r.amount_minor_units ?? 0),
    0,
  );
  const outstandingBalance = (balanceRes.data ?? []).reduce(
    (s, r) => s + (r.balance_minor_units ?? 0),
    0,
  );
  const pendingOrders = pendingRes.count ?? 0;
  const memberCount = memberRes.count ?? 0;
  const activeProducts = activeProductRes.count ?? 0;

  const itemRows = (topItemsRes.data ?? []) as unknown as Array<{
    product_id: string | null;
    product_name: string;
    qty: number;
    unit_price_minor_units: number;
  }>;
  const aggMap = new Map<string, Aggregated>();
  for (const it of itemRows) {
    const key = it.product_id ?? `__deleted__:${it.product_name}`;
    const prev = aggMap.get(key);
    if (prev) {
      prev.qty += it.qty;
      prev.revenueMinorUnits += it.qty * it.unit_price_minor_units;
    } else {
      aggMap.set(key, {
        productId: it.product_id,
        productName: it.product_name,
        qty: it.qty,
        revenueMinorUnits: it.qty * it.unit_price_minor_units,
      });
    }
  }
  const topProducts = Array.from(aggMap.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ctx.organization.name}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total spend"
          value={<Money amount={totalSpend} currency={currency} />}
          sub={currency.name}
        />
        <Stat
          label="Outstanding balance"
          value={<Money amount={outstandingBalance} currency={currency} />}
          sub={`across ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
        />
        <Stat
          label="Pending orders"
          value={String(pendingOrders)}
          href={`/${orgSlug}/admin/orders`}
        />
        <Stat
          label="Active products"
          value={String(activeProducts)}
          href={`/${orgSlug}/admin/products`}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Top products</h2>
        {topProducts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Product</th>
                  <th className="px-4 py-2 text-right font-normal">Units sold</th>
                  <th className="px-4 py-2 text-right font-normal">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.productId ?? p.productName} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      {p.productId ? (
                        <Link
                          href={`/${orgSlug}/admin/products/${p.productId}`}
                          className="hover:underline"
                        >
                          {p.productName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          {p.productName} (deleted)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{p.qty}</td>
                    <td className="px-4 py-2 text-right">
                      <Money amount={p.revenueMinorUnits} currency={currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
}) {
  const body = (
    <>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border p-4 transition-colors hover:bg-muted/30"
      >
        {body}
      </Link>
    );
  }
  return <div className="rounded-lg border p-4">{body}</div>;
}
