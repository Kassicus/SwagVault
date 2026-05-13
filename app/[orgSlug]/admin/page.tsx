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
    service
      .from('transactions')
      .select('amount_minor_units')
      .eq('organization_id', ctx.organizationId)
      .eq('kind', 'spend'),
    service
      .from('memberships')
      .select('balance_minor_units')
      .eq('organization_id', ctx.organizationId),
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('status', 'pending'),
    service
      .from('memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId),
    service
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', ctx.organizationId)
      .eq('active', true),
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
    <div className="space-y-8">
      <div>
        <p className="label-mono text-muted-foreground">{'// Overview'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ctx.organization.name}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          accent="primary"
          label="Total spend"
          value={<Money amount={totalSpend} currency={currency} />}
          sub={currency.name}
        />
        <Stat
          accent="secondary"
          label="Outstanding"
          value={<Money amount={outstandingBalance} currency={currency} />}
          sub={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
        />
        <Stat
          accent="mint"
          label="Pending orders"
          value={String(pendingOrders)}
          href={`/${orgSlug}/admin/orders`}
        />
        <Stat
          accent="foreground"
          label="Active products"
          value={String(activeProducts)}
          href={`/${orgSlug}/admin/products`}
        />
      </div>

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold uppercase">Top products</h2>
        {topProducts.length === 0 ? (
          <div className="border-2 border-dashed border-foreground/40 p-6 text-center text-sm text-muted-foreground">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-hidden border-2 border-foreground bg-card">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Product</th>
                  <th className="px-4 py-3 text-right font-bold">Units sold</th>
                  <th className="px-4 py-3 text-right font-bold">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr
                    key={p.productId ?? p.productName}
                    className={
                      idx === topProducts.length - 1
                        ? ''
                        : 'border-b-2 border-foreground/10'
                    }
                  >
                    <td className="px-4 py-3">
                      {p.productId ? (
                        <Link
                          href={`/${orgSlug}/admin/products/${p.productId}`}
                          className="font-bold hover:text-primary"
                        >
                          {p.productName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground line-through">
                          {p.productName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-heading font-bold tabular-nums">
                      {p.qty}
                    </td>
                    <td className="px-4 py-3 text-right font-heading font-bold tabular-nums">
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

const accentShadow = {
  primary: 'shadow-[5px_5px_0_0_var(--primary)]',
  secondary: 'shadow-[5px_5px_0_0_var(--secondary)]',
  mint: 'shadow-[5px_5px_0_0_var(--mint)]',
  foreground: 'shadow-[5px_5px_0_0_var(--foreground)]',
} as const;

function Stat({
  label,
  value,
  sub,
  href,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  accent: keyof typeof accentShadow;
}) {
  const body = (
    <>
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className="mt-2 font-heading text-3xl font-black tabular-nums">{value}</p>
      {sub ? (
        <p className="mt-1 label-mono text-muted-foreground">{sub}</p>
      ) : null}
    </>
  );
  const cls = `block border-2 border-foreground bg-card p-5 transition-transform ${accentShadow[accent]}`;
  if (href) {
    return (
      <Link
        href={href}
        className={`${cls} hover:-translate-y-0.5`}
      >
        {body}
      </Link>
    );
  }
  return <div className={cls}>{body}</div>;
}
