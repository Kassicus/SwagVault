import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { categoryOf } from '@/lib/audit/log';
import type { Json, TransactionKind } from '@/lib/supabase/types';

export const metadata = { title: 'Audit log · SwagVault' };

type Filter = 'all' | 'money' | 'people' | 'products' | 'orders' | 'settings';
const FILTERS: Filter[] = ['all', 'money', 'people', 'products', 'orders', 'settings'];

const PAGE_SIZE = 100;

type TxnRow = {
  id: string;
  kind: TransactionKind;
  amount_minor_units: number;
  user_id: string;
  actor_user_id: string | null;
  order_id: string | null;
  note: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  action: string;
  actor_user_id: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Json | null;
  created_at: string;
};

type FeedItem =
  | ({ source: 'txn' } & TxnRow)
  | ({ source: 'event' } & EventRow);

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { orgSlug } = await params;
  const { type: typeParam } = await searchParams;
  const filter: Filter = (FILTERS.includes(typeParam as Filter) ? typeParam : 'all') as Filter;

  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);
  const service = createSupabaseServiceClient();

  // Fetch from one or both tables depending on the active filter.
  const wantsMoney = filter === 'all' || filter === 'money';
  const wantsEvents = filter !== 'money';

  const [txnRes, eventRes] = await Promise.all([
    wantsMoney
      ? service
          .from('transactions')
          .select(
            'id, kind, amount_minor_units, user_id, actor_user_id, order_id, note, created_at',
          )
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)
      : Promise.resolve({ data: [] as TxnRow[] }),
    wantsEvents
      ? service
          .from('audit_logs')
          .select(
            'id, action, actor_user_id, target_type, target_id, metadata, created_at',
          )
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false })
          .limit(PAGE_SIZE)
      : Promise.resolve({ data: [] as EventRow[] }),
  ]);

  const allTxns = (txnRes.data ?? []) as TxnRow[];
  const allEvents = (eventRes.data ?? []) as EventRow[];

  // Apply category filter to events (transactions are always "money").
  const eventsAfterFilter =
    filter === 'all'
      ? allEvents
      : filter === 'money'
        ? []
        : allEvents.filter((e) => categoryOf(e.action) === filter);

  const merged: FeedItem[] = [
    ...allTxns.map((t) => ({ source: 'txn' as const, ...t })),
    ...eventsAfterFilter.map((e) => ({ source: 'event' as const, ...e })),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, PAGE_SIZE);

  // Batch-hydrate every distinct user id across both tables.
  const ids = new Set<string>();
  for (const t of allTxns) {
    ids.add(t.user_id);
    if (t.actor_user_id) ids.add(t.actor_user_id);
  }
  for (const e of eventsAfterFilter) {
    if (e.actor_user_id) ids.add(e.actor_user_id);
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
          Every admin action in {ctx.organization.name}, plus the
          financial ledger. Showing the most recent {PAGE_SIZE}.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === 'all' ? `/${orgSlug}/admin/audit-log` : `/${orgSlug}/admin/audit-log?type=${f}`}
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

      {merged.length === 0 ? (
        <div className="border-2 border-dashed border-foreground/40 p-10 text-center text-sm text-muted-foreground">
          Nothing in this category yet.
        </div>
      ) : (
        <div className="overflow-hidden border-2 border-foreground bg-card">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">When</th>
                <th className="px-4 py-3 font-bold">Category</th>
                <th className="px-4 py-3 font-bold">Actor</th>
                <th className="px-4 py-3 font-bold">Event</th>
                <th className="px-4 py-3 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {merged.map((row, idx) => (
                <tr
                  key={`${row.source}-${row.id}`}
                  className={
                    idx === merged.length - 1
                      ? ''
                      : 'border-b-2 border-foreground/10'
                  }
                >
                  <td className="px-4 py-3 text-muted-foreground tabular-nums whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {row.source === 'txn' ? (
                      <Badge variant="outline">money</Badge>
                    ) : (
                      <CategoryBadge action={row.action} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.actor_user_id ? emails[row.actor_user_id] : 'system'}
                  </td>
                  <td className="px-4 py-3">
                    {row.source === 'txn'
                      ? renderTxn(row, emails, orgSlug)
                      : renderEvent(row, orgSlug)}
                  </td>
                  <td className="px-4 py-3 text-right font-heading font-bold tabular-nums">
                    {row.source === 'txn' ? (
                      <span
                        className={row.amount_minor_units < 0 ? '' : 'text-mint'}
                      >
                        {row.amount_minor_units < 0 ? '−' : '+'}
                        <Money
                          amount={Math.abs(row.amount_minor_units)}
                          currency={currency}
                        />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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

function CategoryBadge({ action }: { action: string }) {
  const cat = categoryOf(action);
  const variant =
    cat === 'people'
      ? 'mint'
      : cat === 'products'
        ? 'primary'
        : cat === 'orders'
          ? 'warn'
          : cat === 'settings'
            ? 'muted'
            : 'outline';
  return <Badge variant={variant}>{cat}</Badge>;
}

function renderTxn(
  t: TxnRow,
  emails: Record<string, string>,
  slug: string,
): React.ReactNode {
  const recipient = emails[t.user_id] ?? '(unknown)';
  const kindLabel = `${t.kind} → ${recipient}`;
  const note = t.note ? ` · ${t.note}` : '';
  if (t.order_id) {
    return (
      <>
        {kindLabel}
        {note}
        {' · '}
        <Link
          href={`/${slug}/admin/orders/${t.order_id}`}
          className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          order
        </Link>
      </>
    );
  }
  return (
    <>
      {kindLabel}
      {note}
    </>
  );
}

function renderEvent(e: EventRow, slug: string): React.ReactNode {
  const meta = (e.metadata ?? {}) as Record<string, unknown>;
  const email = typeof meta.email === 'string' ? meta.email : null;
  const role = typeof meta.role === 'string' ? meta.role : null;
  const name = typeof meta.name === 'string' ? meta.name : null;

  switch (e.action) {
    case 'invite_sent':
      return `Invited ${email ?? 'someone'}${role ? ` as ${role}` : ''}`;
    case 'invite_resent':
      return `Resent invite to ${email ?? 'someone'}`;
    case 'invite_revoked':
      return `Revoked invite for ${email ?? 'someone'}`;
    case 'invite_accepted':
      return `Accepted invitation${email ? ` (${email})` : ''}`;
    case 'member_added':
      return `Added ${email ?? 'a member'}${role ? ` as ${role}` : ''}`;
    case 'member_role_changed':
      return `Changed role for ${email ?? 'a member'} to ${role ?? '?'}`;
    case 'member_removed':
      return `Removed ${email ?? 'a member'}`;
    case 'product_created':
      return (
        <>
          Created product{' '}
          {e.target_id ? (
            <Link
              href={`/${slug}/admin/products/${e.target_id}`}
              className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
            >
              {name ?? 'untitled'}
            </Link>
          ) : (
            (name ?? 'untitled')
          )}
        </>
      );
    case 'product_updated':
      return (
        <>
          Updated product{' '}
          {e.target_id ? (
            <Link
              href={`/${slug}/admin/products/${e.target_id}`}
              className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
            >
              {name ?? 'untitled'}
            </Link>
          ) : (
            (name ?? 'untitled')
          )}
        </>
      );
    case 'product_deleted':
      return `Deleted product ${name ?? '(unknown)'}`;
    case 'order_fulfilled':
      return (
        <>
          Marked order{' '}
          {e.target_id ? (
            <Link
              href={`/${slug}/admin/orders/${e.target_id}`}
              className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
            >
              {e.target_id.slice(0, 8)}
            </Link>
          ) : (
            'an order'
          )}{' '}
          fulfilled
        </>
      );
    case 'order_cancelled':
      return (
        <>
          Cancelled order{' '}
          {e.target_id ? (
            <Link
              href={`/${slug}/admin/orders/${e.target_id}`}
              className="underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
            >
              {e.target_id.slice(0, 8)}
            </Link>
          ) : (
            'an order'
          )}
        </>
      );
    case 'currency_updated':
      return 'Updated currency settings';
    case 'settings_updated':
      return 'Updated org settings';
    case 'subscription_changed':
      return `Subscription changed${
        typeof meta.stripe_event_type === 'string'
          ? ` (${meta.stripe_event_type})`
          : ''
      }`;
    default:
      return e.action;
  }
}
