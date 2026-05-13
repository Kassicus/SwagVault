import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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

  const buyers: Record<string, string> = {};
  for (const o of orders ?? []) {
    if (buyers[o.user_id]) continue;
    const { data } = await service.auth.admin.getUserById(o.user_id);
    buyers[o.user_id] = data?.user?.email ?? '(unknown)';
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-mono text-muted-foreground">{'// Fulfillment'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Orders
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fulfill or cancel orders. Cancelling refunds the buyer and restores
          inventory.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={
              s === 'pending'
                ? `/${orgSlug}/admin/orders`
                : `/${orgSlug}/admin/orders?status=${s}`
            }
            className={
              status === s
                ? 'border-2 border-foreground bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-background'
                : 'border-2 border-foreground bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          >
            {s}
          </Link>
        ))}
      </div>

      {(orders ?? []).length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-10 text-center text-sm text-muted-foreground">
          No orders {status === 'all' ? 'yet' : `with status "${status}"`}.
        </div>
      ) : (
        <div className="overflow-hidden border-2 border-foreground bg-card">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Placed</th>
                <th className="px-4 py-3 font-bold">Member</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 font-bold">Fulfillment</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {(orders ?? []).map((o, idx) => (
                <tr
                  key={o.id}
                  className={
                    idx === (orders ?? []).length - 1
                      ? ''
                      : 'border-b-2 border-foreground/10'
                  }
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{buyers[o.user_id]}</td>
                  <td className="px-4 py-3 font-heading font-bold tabular-nums">
                    <Money amount={o.total_minor_units} currency={currency} />
                  </td>
                  <td className="px-4 py-3 label-mono text-muted-foreground">
                    {o.fulfillment_method === 'shipping' ? 'Ship' : 'Pickup'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${orgSlug}/admin/orders/${o.id}`}
                      className="label-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                    >
                      Open →
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
  const variant =
    status === 'pending'
      ? 'warn'
      : status === 'fulfilled'
        ? 'mint'
        : 'muted';
  return <Badge variant={variant}>{status}</Badge>;
}
