import { notFound } from 'next/navigation';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { getProductWithVariants } from '@/lib/products/server';
import { variantDisplayName } from '@/lib/products/types';
import { ProductDetail } from './product-detail';

export default async function PDP({
  params,
}: {
  params: Promise<{ orgSlug: string; productId: string }>;
}) {
  const { orgSlug, productId } = await params;
  const ctx = await requireOrg(orgSlug);
  const [product, currency] = await Promise.all([
    getProductWithVariants(ctx.organizationId, productId),
    getOrgCurrency(ctx.organizationId),
  ]);
  if (!product) notFound();

  const activeVariants = product.variants.filter((v) => v.active);

  return (
    <ProductDetail
      slug={orgSlug}
      product={product}
      activeVariants={activeVariants.map((v) => ({
        id: v.id,
        name: v.name,
        display: variantDisplayName(v),
        price_minor_units: v.price_minor_units,
        inventory_count: v.inventory_count,
      }))}
      currency={{
        name: currency.name,
        symbol: currency.symbol,
        decimal_places: currency.decimal_places,
      }}
    />
  );
}
