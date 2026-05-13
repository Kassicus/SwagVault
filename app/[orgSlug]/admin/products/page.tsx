import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import { buttonVariants } from '@/components/ui/button';
import {
  listProducts,
  isMultiVariant,
  minPriceMinorUnits,
  totalInventory,
} from '@/lib/products/server';

export const metadata = { title: 'Products · SwagVault' };

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);
  const [products, currency] = await Promise.all([
    listProducts(ctx.organizationId, { adminView: true }),
    getOrgCurrency(ctx.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Items teammates can spend their {currency.name} on.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/admin/products/new`}
          className={buttonVariants({ size: 'default' })}
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState slug={orgSlug} />
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-normal">Product</th>
                <th className="px-4 py-2 font-normal">Price</th>
                <th className="px-4 py-2 font-normal">Variants</th>
                <th className="px-4 py-2 font-normal">Inventory</th>
                <th className="px-4 py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/admin/products/${p.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      {p.image_paths[0] ? (
                        <Image
                          src={p.image_paths[0]}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded border bg-background object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted/40" />
                      )}
                      <span className="font-medium">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {isMultiVariant(p) ? (
                      <>
                        from <Money amount={minPriceMinorUnits(p)} currency={currency} />
                      </>
                    ) : (
                      <Money amount={minPriceMinorUnits(p)} currency={currency} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {isMultiVariant(p) ? `${p.variants.length} variants` : '—'}
                  </td>
                  <td className="px-4 py-3">{totalInventory(p)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        p.active
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                      }
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ slug }: { slug: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="text-sm text-muted-foreground">
        No products yet.
      </p>
      <Link
        href={`/${slug}/admin/products/new`}
        className={`${buttonVariants({ size: 'default' })} mt-4`}
      >
        Add your first product
      </Link>
    </div>
  );
}
