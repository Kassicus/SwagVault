import Image from 'next/image';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Money } from '@/lib/currency/money';

export default async function StorefrontHome({
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

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {ctx.organization.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Storefront placeholder — products land in Phase 3.
        </p>
      </header>

      <section
        className="flex items-center justify-between rounded-lg border p-5"
        style={{ borderColor: currency.color_hex }}
      >
        <div className="flex items-center gap-3">
          {currency.icon_url ? (
            <Image
              src={currency.icon_url}
              alt=""
              width={32}
              height={32}
              className="rounded"
            />
          ) : (
            <div
              className="grid h-8 w-8 place-items-center rounded text-sm font-semibold text-white"
              style={{ backgroundColor: currency.color_hex }}
            >
              {currency.symbol.slice(0, 1)}
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Your balance
            </div>
            <div className="text-xl font-semibold">
              <Money amount={balance} currency={currency} />{' '}
              <span className="text-sm font-normal text-muted-foreground">
                {currency.name}
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
