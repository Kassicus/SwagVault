import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { ProductForm } from '../product-form';

export const metadata = { title: 'New product · SwagVault' };

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/${orgSlug}/admin/products`}
          className="label-mono text-muted-foreground hover:text-foreground"
        >
          ← All products
        </Link>
        <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
          New product
        </h1>
      </div>
      <ProductForm slug={orgSlug} currency={currency} />
    </div>
  );
}
