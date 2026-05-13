import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listUserTransactions } from '@/lib/orders/server';

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
    .select('balance_minor_units')
    .eq('organization_id', ctx.organizationId)
    .eq('user_id', ctx.userId)
    .single();
  const balance = membership?.balance_minor_units ?? 0;

  const transactions = await listUserTransactions(
    ctx.organizationId,
    ctx.userId,
  );

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

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Recent activity</h2>
        {transactions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-normal">Date</th>
                  <th className="px-4 py-2 font-normal">Type</th>
                  <th className="px-4 py-2 font-normal">Note</th>
                  <th className="px-4 py-2 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isNeg = tx.amount_minor_units < 0;
                  return (
                    <tr key={tx.id} className="border-b last:border-0">
                      <td className="px-4 py-2 text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">{tx.kind}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {tx.note ?? '—'}
                      </td>
                      <td
                        className={`px-4 py-2 text-right tabular-nums ${
                          isNeg ? 'text-foreground' : 'text-emerald-600'
                        }`}
                      >
                        {isNeg ? '−' : '+'}
                        <Money
                          amount={Math.abs(tx.amount_minor_units)}
                          currency={currency}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
