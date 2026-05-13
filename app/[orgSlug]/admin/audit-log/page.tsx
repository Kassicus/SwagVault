import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { TransactionKind } from '@/lib/supabase/types';

export const metadata = { title: 'Audit log · SwagVault' };

type Filter = 'all' | TransactionKind;
const FILTERS: Filter[] = ['all', 'grant', 'spend', 'refund', 'adjustment'];

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { orgSlug } = await params;
  const { kind: kindParam } = await searchParams;
  const filter: Filter = (FILTERS.includes(kindParam as Filter) ? kindParam : 'all') as Filter;

  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const service = createSupabaseServiceClient();
  let query = service
    .from('transactions')
    .select(
      'id, kind, amount_minor_units, user_id, actor_user_id, order_id, note, created_at',
    )
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (filter !== 'all') query = query.eq('kind', filter);

  const { data: rows } = await query;

  // Batch-hydrate every distinct user id (recipient + actor).
  const ids = new Set<string>();
  for (const r of rows ?? []) {
    ids.add(r.user_id);
    if (r.actor_user_id) ids.add(r.actor_user_id);
  }
  const emails: Record<string, string> = {};
  for (const id of ids) {
    const { data } = await service.auth.admin.getUserById(id);
    emails[id] = data?.user?.email ?? '(unknown)';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every {currency.name} transaction in {ctx.organization.name}, including
          who initiated it. Showing the most recent {PAGE_SIZE}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? `/${orgSlug}/admin/audit-log` : `/${orgSlug}/admin/audit-log?kind=${f}`}
            className={
              filter === f
                ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                : 'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground'
            }
          >
            {f}
          </Link>
        ))}
      </div>

      {(rows ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No {filter === 'all' ? 'transactions' : `${filter} transactions`} yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">When</th>
                <th className="px-4 py-2 font-normal">Kind</th>
                <th className="px-4 py-2 font-normal">Member</th>
                <th className="px-4 py-2 text-right font-normal">Amount</th>
                <th className="px-4 py-2 font-normal">Actor</th>
                <th className="px-4 py-2 font-normal">Note / order</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const isNeg = r.amount_minor_units < 0;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2 text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-2">{r.kind}</td>
                    <td className="px-4 py-2">{emails[r.user_id]}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        isNeg ? 'text-foreground' : 'text-emerald-600'
                      }`}
                    >
                      {isNeg ? '−' : '+'}
                      <Money
                        amount={Math.abs(r.amount_minor_units)}
                        currency={currency}
                      />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.actor_user_id ? emails[r.actor_user_id] : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.order_id ? (
                        <Link
                          href={`/${orgSlug}/admin/orders/${r.order_id}`}
                          className="underline"
                        >
                          {r.note ?? 'Order'}
                        </Link>
                      ) : (
                        r.note ?? '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
