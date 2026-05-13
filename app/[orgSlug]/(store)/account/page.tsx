import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata = { title: 'My account · SwagVault' };

export default async function AccountPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from('memberships')
    .select('balance_minor_units, leaderboard_visible')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.userId)
    .single();
  const balance = membership?.balance_minor_units ?? 0;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">My account</h1>

      <section
        className="rounded-lg border p-5"
        style={{ borderColor: currency.color_hex }}
      >
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Balance
        </div>
        <div className="mt-1 text-3xl font-semibold">
          <Money amount={balance} currency={currency} />{' '}
          <span className="text-base font-normal text-muted-foreground">
            {currency.name}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
        Order history and a transactions ledger land in Phase 4. For now this
        page just shows your current balance.
      </section>
    </div>
  );
}
