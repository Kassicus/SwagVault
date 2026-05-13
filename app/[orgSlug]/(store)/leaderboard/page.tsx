import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export const metadata = { title: 'Leaderboard · SwagVault' };

const ROLLING_DAYS = 30;
const TOP_N = 25;

type Aggregated = {
  userId: string;
  totalMinorUnits: number;
};

function rollingWindowSinceISO(): string {
  return new Date(
    Date.now() - ROLLING_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  if (!ctx.organization.leaderboard_enabled) notFound();

  const currency = await getOrgCurrency(ctx.organizationId);

  const since = rollingWindowSinceISO();

  const service = createSupabaseServiceClient();

  const { data: visibleMembers } = await service
    .from('memberships')
    .select('user_id')
    .eq('organization_id', ctx.organizationId)
    .eq('leaderboard_visible', true);

  const visibleSet = new Set((visibleMembers ?? []).map((m) => m.user_id));
  if (visibleSet.size === 0) {
    return <EmptyState reason="no_visible" />;
  }

  const { data: spendRows } = await service
    .from('transactions')
    .select('user_id, amount_minor_units')
    .eq('organization_id', ctx.organizationId)
    .eq('kind', 'spend')
    .gte('created_at', since)
    .in('user_id', Array.from(visibleSet));

  if (!spendRows || spendRows.length === 0) {
    return <EmptyState reason="no_spend" />;
  }

  const agg = new Map<string, Aggregated>();
  for (const r of spendRows) {
    const prev = agg.get(r.user_id);
    const add = -r.amount_minor_units;
    if (prev) prev.totalMinorUnits += add;
    else agg.set(r.user_id, { userId: r.user_id, totalMinorUnits: add });
  }
  const ranked = Array.from(agg.values())
    .filter((r) => r.totalMinorUnits > 0)
    .sort((a, b) => b.totalMinorUnits - a.totalMinorUnits)
    .slice(0, TOP_N);

  const display: Array<{ rank: number; label: string; total: number; isMe: boolean }> = [];
  for (let i = 0; i < ranked.length; i++) {
    const r = ranked[i];
    const { data } = await service.auth.admin.getUserById(r.userId);
    const email = data?.user?.email ?? 'unknown';
    display.push({
      rank: i + 1,
      label: email,
      total: r.totalMinorUnits,
      isMe: r.userId === ctx.userId,
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="label-mono text-muted-foreground">{'// Top spenders'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Leaderboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Top spenders of {currency.name} in the last {ROLLING_DAYS} days.
        </p>
      </header>

      <div className="overflow-hidden border-2 border-foreground bg-card">
        <table className="w-full text-sm">
          <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
            <tr>
              <th className="w-16 px-4 py-3 font-bold">Rank</th>
              <th className="px-4 py-3 font-bold">Member</th>
              <th className="px-4 py-3 text-right font-bold">Spent</th>
            </tr>
          </thead>
          <tbody>
            {display.map((row, idx) => (
              <tr
                key={`${row.rank}-${row.label}`}
                className={`${
                  idx === display.length - 1
                    ? ''
                    : 'border-b-2 border-foreground/10'
                } ${row.isMe ? 'bg-primary/15' : ''}`}
              >
                <td className="px-4 py-3 tabular-nums">
                  <RankBadge rank={row.rank} />
                </td>
                <td className="px-4 py-3">
                  <span className="font-bold">{row.label}</span>
                  {row.isMe ? (
                    <Badge variant="primary" className="ml-2">
                      You
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right font-heading font-bold tabular-nums">
                  <Money amount={row.total} currency={currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="label-mono text-muted-foreground">
        Members who opt out on their account page are not shown.
      </p>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-grid size-8 place-items-center border-2 border-foreground bg-primary font-heading text-base font-black text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-grid size-8 place-items-center border-2 border-foreground bg-secondary font-heading text-base font-black text-secondary-foreground">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-grid size-8 place-items-center border-2 border-foreground bg-mint font-heading text-base font-black text-mint-foreground">
        3
      </span>
    );
  }
  return (
    <span className="inline-grid size-8 place-items-center font-heading font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

function EmptyState({
  reason,
}: {
  reason: 'no_visible' | 'no_spend';
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <p className="label-mono text-muted-foreground">{'// Top spenders'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          Leaderboard
        </h1>
      </header>
      <div className="border-2 border-dashed border-foreground/40 p-10 text-center">
        <p className="font-heading text-2xl font-bold uppercase">
          {reason === 'no_visible'
            ? 'Crickets.'
            : 'No spending yet.'}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {reason === 'no_visible'
            ? 'Everyone has opted out.'
            : 'Nobody has spent in the last 30 days.'}
        </p>
      </div>
    </div>
  );
}
