import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { CheckoutView } from './checkout-view';

export const metadata = { title: 'Checkout · SwagVault' };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  return (
    <CheckoutView
      slug={orgSlug}
      orgId={ctx.organizationId}
      fulfillmentMode={ctx.organization.fulfillment_mode}
      currency={{
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
      }}
    />
  );
}
