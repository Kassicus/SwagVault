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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <ProductForm slug={orgSlug} currency={currency} />
    </div>
  );
}
