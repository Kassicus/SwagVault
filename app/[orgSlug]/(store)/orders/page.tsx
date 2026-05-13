import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { listUserOrders } from '@/lib/orders/server';

export const metadata = { title: 'My orders · SwagVault' };

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const [orders, currency] = await Promise.all([
    listUserOrders(ctx.organizationId, ctx.userId),
    getOrgCurrency(ctx.organizationId),
  ]);

  if (orders.length === 0) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader />
        <div className="border-2 border-dashed border-foreground/40 p-10 text-center">
          <p className="font-heading text-2xl font-bold uppercase">
            Nothing here yet.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Spend some coins and your orders will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader />
      <div className="overflow-hidden border-2 border-foreground bg-card">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Placed</th>
              <th className="px-4 py-3 font-bold">Total</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Fulfillment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, idx) => (
              <tr
                key={o.id}
                className={
                  idx === orders.length - 1
                    ? ''
                    : 'border-b-2 border-foreground/10'
                }
              >
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 font-heading font-bold tabular-nums">
                  <Money amount={o.total_minor_units} currency={currency} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 label-mono text-muted-foreground">
                  {o.fulfillment_method === 'shipping' ? 'Ship' : 'Pickup'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${orgSlug}/orders/${o.id}`}
                    className="label-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="label-mono text-muted-foreground">{'// History'}</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
        My orders
      </h1>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'pending'
      ? 'warn'
      : status === 'fulfilled'
        ? 'mint'
        : 'muted';
  return <Badge variant={variant}>{status}</Badge>;
}
