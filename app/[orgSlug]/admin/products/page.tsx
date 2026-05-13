import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-mono text-muted-foreground">{'// Catalog'}</p>
          <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
            Products
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Items teammates can spend their {currency.name} on.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/admin/products/new`}
          className={buttonVariants({ size: 'default' })}
        >
          + New product
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState slug={orgSlug} />
      ) : (
        <div className="overflow-hidden border-2 border-foreground bg-card">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted text-left label-mono text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Product</th>
                <th className="px-4 py-3 font-bold">Price</th>
                <th className="px-4 py-3 font-bold">Variants</th>
                <th className="px-4 py-3 font-bold">Inventory</th>
                <th className="px-4 py-3 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr
                  key={p.id}
                  className={
                    idx === products.length - 1
                      ? ''
                      : 'border-b-2 border-foreground/10'
                  }
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${orgSlug}/admin/products/${p.id}`}
                      className="flex items-center gap-3 hover:text-primary"
                    >
                      {p.image_paths[0] ? (
                        <Image
                          src={p.image_paths[0]}
                          alt=""
                          width={40}
                          height={40}
                          className="border-2 border-foreground object-cover"
                        />
                      ) : (
                        <div className="size-10 border-2 border-foreground bg-muted" />
                      )}
                      <span className="font-bold">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-heading font-bold tabular-nums">
                    {isMultiVariant(p) ? (
                      <>
                        <span className="label-mono text-muted-foreground">from</span>{' '}
                        <Money amount={minPriceMinorUnits(p)} currency={currency} />
                      </>
                    ) : (
                      <Money amount={minPriceMinorUnits(p)} currency={currency} />
                    )}
                  </td>
                  <td className="px-4 py-3 label-mono text-muted-foreground">
                    {isMultiVariant(p) ? `${p.variants.length} variants` : '—'}
                  </td>
                  <td className="px-4 py-3 font-heading font-bold tabular-nums">
                    {totalInventory(p)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? 'mint' : 'muted'}>
                      {p.active ? 'Active' : 'Inactive'}
                    </Badge>
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
    <div className="border-2 border-dashed border-foreground/40 p-12 text-center">
      <p className="font-heading text-2xl font-bold uppercase">No products yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Add the first thing your team can redeem coins for.
      </p>
      <Link
        href={`/${slug}/admin/products/new`}
        className={`${buttonVariants({ size: 'default' })} mt-5`}
      >
        + Add your first product
      </Link>
    </div>
  );
}
