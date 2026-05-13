import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Orders · SwagVault' };

type Status = 'all' | 'pending' | 'fulfilled' | 'cancelled';
const STATUSES: Status[] = ['all', 'pending', 'fulfilled', 'cancelled'];

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug } = await params;
  const { status: statusParam } = await searchParams;
  const status: Status = (
    STATUSES.includes(statusParam as Status) ? statusParam : 'pending'
  ) as Status;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const service = createSupabaseServiceClient();
  let query = service
    .from('orders')
    .select(
      'id, user_id, status, fulfillment_method, total_minor_units, created_at',
    )
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (status !== 'all') query = query.eq('status', status);

  const { data: orders } = await query;

  // Hydrate buyer emails.
  const buyers: Record<string, string> = {};
  for (const o of orders ?? []) {
    if (buyers[o.user_id]) continue;
    const { data } = await service.auth.admin.getUserById(o.user_id);
    buyers[o.user_id] = data?.user?.email ?? '(unknown)';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fulfill or cancel orders. Cancelling refunds the buyer and restores
          inventory.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === 'pending' ? `/${orgSlug}/admin/orders` : `/${orgSlug}/admin/orders?status=${s}`}
            className={
              status === s
                ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                : 'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground'
            }
          >
            {s}
          </Link>
        ))}
      </div>

      {(orders ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No orders {status === 'all' ? 'yet' : `with status "${status}"`}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">Placed</th>
                <th className="px-4 py-2 font-normal">Member</th>
                <th className="px-4 py-2 font-normal">Total</th>
                <th className="px-4 py-2 font-normal">Fulfillment</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o) => (
                <tr key={o.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{buyers[o.user_id]}</td>
                  <td className="px-4 py-3">
                    <Money amount={o.total_minor_units} currency={currency} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {o.fulfillment_method === 'shipping' ? 'Ship' : 'Pickup'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${orgSlug}/admin/orders/${o.id}`}
                      className="text-sm underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
