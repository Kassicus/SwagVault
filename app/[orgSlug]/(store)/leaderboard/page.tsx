import { notFound } from 'next/navigation';
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

// Extracted so the React 19 purity rule doesn't flag Date.now() in the
// component body. The leaderboard page renders fresh per request anyway.
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

  // 1. Find members who haven't opted out.
  const { data: visibleMembers } = await service
    .from('memberships')
    .select('user_id')
    .eq('organization_id', ctx.organizationId)
    .eq('leaderboard_visible', true);

  const visibleSet = new Set((visibleMembers ?? []).map((m) => m.user_id));
  if (visibleSet.size === 0) {
    return <EmptyState slug={orgSlug} reason="no_visible" />;
  }

  // 2. All spend transactions in the rolling window, scoped to visible members.
  const { data: spendRows } = await service
    .from('transactions')
    .select('user_id, amount_minor_units')
    .eq('organization_id', ctx.organizationId)
    .eq('kind', 'spend')
    .gte('created_at', since)
    .in('user_id', Array.from(visibleSet));

  if (!spendRows || spendRows.length === 0) {
    return <EmptyState slug={orgSlug} reason="no_spend" />;
  }

  // 3. Aggregate by user — spend amounts are stored negative, so the absolute
  // value is the user's total spend.
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

  // 4. Hydrate display names.
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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          Top spenders of {currency.name} in the last {ROLLING_DAYS} days.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-12 px-4 py-2 font-normal">Rank</th>
              <th className="px-4 py-2 font-normal">Member</th>
              <th className="px-4 py-2 text-right font-normal">Spent</th>
            </tr>
          </thead>
          <tbody>
            {display.map((row) => (
              <tr
                key={`${row.rank}-${row.label}`}
                className={`border-b last:border-0 ${
                  row.isMe ? 'bg-amber-50' : ''
                }`}
              >
                <td className="px-4 py-3 tabular-nums">
                  <span className="font-medium">{row.rank}</span>
                </td>
                <td className="px-4 py-3">
                  {row.label}
                  {row.isMe ? (
                    <span className="ml-2 rounded bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background">
                      you
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  <Money amount={row.total} currency={currency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Members who opt out on their account page are not shown.
      </p>
    </div>
  );
}

function EmptyState({
  slug,
  reason,
}: {
  slug: string;
  reason: 'no_visible' | 'no_spend';
}) {
  void slug;
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {reason === 'no_visible'
          ? 'No participants yet — everyone has opted out.'
          : 'No spending in the last 30 days yet.'}
      </p>
    </div>
  );
}
