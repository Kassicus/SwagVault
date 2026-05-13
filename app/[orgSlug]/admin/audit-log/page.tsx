import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-8">
      <div>
        <p className="label-mono text-muted-foreground">{'// History'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Audit log
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
                ? 'border-2 border-foreground bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-background'
                : 'border-2 border-foreground bg-transparent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          >
            {f}
          </Link>
        ))}
      </div>

      {(rows ?? []).length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-10 text-center text-sm text-muted-foreground">
          No {filter === 'all' ? 'transactions' : `${filter} transactions`} yet.
        </div>
      ) : (
        <div className="overflow-hidden border-2 border-foreground bg-card">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Kind</th>
                <th className="px-4 py-3 font-bold">Member</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
                <th className="px-4 py-3 font-bold">Actor</th>
                <th className="px-4 py-3 font-bold">Note / order</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, idx) => {
                const isNeg = r.amount_minor_units < 0;
                return (
                  <tr
                    key={r.id}
                    className={
                      idx === (rows ?? []).length - 1
                        ? ''
                        : 'border-b-2 border-foreground/10'
                    }
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <KindBadge kind={r.kind} />
                    </td>
                    <td className="px-4 py-3">{emails[r.user_id]}</td>
                    <td
                      className={`px-4 py-3 text-right font-heading font-bold tabular-nums ${
                        isNeg ? 'text-foreground' : 'text-mint'
                      }`}
                    >
                      {isNeg ? '−' : '+'}
                      <Money
                        amount={Math.abs(r.amount_minor_units)}
                        currency={currency}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.actor_user_id ? emails[r.actor_user_id] : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.order_id ? (
                        <Link
                          href={`/${orgSlug}/admin/orders/${r.order_id}`}
                          className="text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
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

function KindBadge({ kind }: { kind: string }) {
  const variant =
    kind === 'grant'
      ? 'mint'
      : kind === 'spend'
        ? 'muted'
        : kind === 'refund'
          ? 'primary'
          : 'outline';
  return <Badge variant={variant}>{kind}</Badge>;
}
