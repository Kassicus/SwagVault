import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { CartView } from './cart-view';

export const metadata = { title: 'Cart · SwagVault' };

export default async function CartPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrg(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  return (
    <CartView
      slug={orgSlug}
      orgId={ctx.organizationId}
      currency={{
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
      }}
    />
  );
}
