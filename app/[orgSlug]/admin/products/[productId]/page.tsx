import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { getProductWithVariants } from '@/lib/products/server';
import { Button } from '@/components/ui/button';
import { ProductForm } from '../product-form';
import { deleteProductAction } from '../actions';

export const metadata = { title: 'Edit product · SwagVault' };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ orgSlug: string; productId: string }>;
}) {
  const { orgSlug, productId } = await params;
  const ctx = await requireAdmin(orgSlug);
  const [product, currency] = await Promise.all([
    getProductWithVariants(ctx.organizationId, productId, { adminView: true }),
    getOrgCurrency(ctx.organizationId),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
        <form action={deleteProductAction}>
          <input type="hidden" name="slug" value={orgSlug} />
          <input type="hidden" name="product_id" value={product.id} />
          <Button
            type="submit"
            variant="destructive"
            size="sm"
            onClick={(e) => {
              if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete
          </Button>
        </form>
      </div>
      <ProductForm slug={orgSlug} currency={currency} initial={product} />
    </div>
  );
}
