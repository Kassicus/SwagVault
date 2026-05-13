import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { CurrencyForm } from './currency-form';

export const metadata = { title: 'Currency · SwagVault' };

export default async function CurrencyPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Currency</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What you call your internal reward currency and how it&rsquo;s
          rendered across the storefront and admin.
        </p>
      </div>
      <CurrencyForm
        slug={orgSlug}
        initial={{
          name: currency.name,
          symbol: currency.symbol,
          color_hex: currency.color_hex,
          decimal_places: currency.decimal_places,
          icon_url: currency.icon_url,
        }}
      />
    </div>
  );
}
