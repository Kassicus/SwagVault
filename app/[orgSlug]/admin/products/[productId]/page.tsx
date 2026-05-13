import Link from 'next/link';
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href={`/${orgSlug}/admin/products`}
            className="label-mono text-muted-foreground hover:text-foreground"
          >
            ← All products
          </Link>
          <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
            {product.name}
          </h1>
        </div>
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
