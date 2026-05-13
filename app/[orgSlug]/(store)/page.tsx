import Image from 'next/image';
import Link from 'next/link';
import { requireOrg } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';
import {
  listProducts,
  isMultiVariant,
  minPriceMinorUnits,
  totalInventory,
} from '@/lib/products/server';

export default async function StorefrontHome({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tag?: string }>;
}) {
  const { orgSlug } = await params;
  const { tag } = await searchParams;
  const ctx = await requireOrg(orgSlug);
  const [products, currency] = await Promise.all([
    listProducts(ctx.organizationId, { tag }),
    getOrgCurrency(ctx.organizationId),
  ]);

  const allTags = new Set<string>();
  for (const p of products) p.tags.forEach((t) => allTags.add(t));
  // If filtering by an unused tag, also surface no-results state.

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Shop</h1>
        {tag ? (
          <Link
            href={`/${orgSlug}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Clear filter
          </Link>
        ) : null}
      </div>

      {allTags.size > 0 ? (
        <TagFilter slug={orgSlug} tags={Array.from(allTags).sort()} active={tag} />
      ) : null}

      {products.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {tag
            ? `Nothing tagged "${tag}" yet.`
            : 'No products listed yet — check back soon.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const minPrice = minPriceMinorUnits(p);
            const inv = totalInventory(p);
            const out = inv === 0;
            return (
              <Link
                key={p.id}
                href={`/${orgSlug}/product/${p.id}`}
                className="group space-y-2"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/30">
                  {p.image_paths[0] ? (
                    <Image
                      src={p.image_paths[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : null}
                  {out ? (
                    <span className="absolute left-2 top-2 rounded bg-background/90 px-2 py-0.5 text-xs">
                      Out of stock
                    </span>
                  ) : null}
                </div>
                <div className="space-y-0.5">
                  <div className="text-sm font-medium leading-tight">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {isMultiVariant(p) ? (
                      <>
                        from <Money amount={minPrice} currency={currency} />
                      </>
                    ) : (
                      <Money amount={minPrice} currency={currency} />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TagFilter({
  slug,
  tags,
  active,
}: {
  slug: string;
  tags: string[];
  active?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((t) => {
        const selected = t === active;
        return (
          <Link
            key={t}
            href={selected ? `/${slug}` : `/${slug}?tag=${encodeURIComponent(t)}`}
            className={
              selected
                ? 'rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                : 'rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground'
            }
          >
            {t}
          </Link>
        );
      })}
    </div>
  );
}
