import Link from 'next/link';
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
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          You haven&rsquo;t placed any orders yet.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-normal">Placed</th>
              <th className="px-4 py-2 font-normal">Total</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Fulfillment</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Money amount={o.total_minor_units} currency={currency} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {o.fulfillment_method === 'shipping' ? 'Ship' : 'Pickup'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${orgSlug}/orders/${o.id}`}
                    className="text-sm underline"
                  >
                    View
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-900',
    fulfilled: 'bg-emerald-100 text-emerald-900',
    cancelled: 'bg-zinc-200 text-zinc-700 line-through',
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs ${map[status] ?? ''}`}
    >
      {status}
    </span>
  );
}
