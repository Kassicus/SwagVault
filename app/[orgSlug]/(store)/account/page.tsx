import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
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
    <div className="max-w-2xl space-y-8">
      <div>
        <p className="label-mono text-muted-foreground">{'// Account'}</p>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          My account
        </h1>
      </div>

      <section
        className="relative border-2 border-foreground bg-card p-6 shadow-[5px_5px_0_0_var(--primary)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="label-mono text-muted-foreground">Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-5xl font-black tabular-nums">
                <Money amount={balance} currency={currency} />
              </span>
              <span className="label-mono text-muted-foreground">
                {currency.name}
              </span>
            </div>
          </div>
          {currency.icon_url ? (
            <Image
              src={currency.icon_url}
              alt=""
              width={48}
              height={48}
              className="border-2 border-foreground"
            />
          ) : (
            <div
              className="grid size-12 place-items-center border-2 border-foreground font-heading text-xl font-bold text-black"
              style={{ backgroundColor: currency.color_hex }}
            >
              {currency.symbol.slice(0, 1)}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-heading text-xl font-bold uppercase">
          Recent activity
        </h2>
        {transactions.length === 0 ? (
          <p className="border-2 border-dashed border-foreground/40 p-6 text-center text-sm text-muted-foreground">
            No transactions yet.
          </p>
        ) : (
          <div className="overflow-hidden border-2 border-foreground bg-card">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold">Note</th>
                  <th className="px-4 py-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => {
                  const isNeg = tx.amount_minor_units < 0;
                  return (
                    <tr
                      key={tx.id}
                      className={
                        idx === transactions.length - 1
                          ? ''
                          : 'border-b-2 border-foreground/10'
                      }
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isNeg ? 'muted' : 'mint'}>{tx.kind}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {tx.note ?? '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-heading font-bold tabular-nums ${
                          isNeg ? 'text-foreground' : 'text-mint'
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
