import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label-mono text-muted-foreground">{'// The Vault'}</p>
          <h1 className="mt-2 font-heading text-5xl font-black uppercase tracking-tight">
            Shop
          </h1>
        </div>
        {tag ? (
          <Link
            href={`/${orgSlug}`}
            className="label-mono text-muted-foreground hover:text-foreground"
          >
            ← Clear filter
          </Link>
        ) : null}
      </div>

      {allTags.size > 0 ? (
        <TagFilter slug={orgSlug} tags={Array.from(allTags).sort()} active={tag} />
      ) : null}

      {products.length === 0 ? (
        <p className="border-2 border-dashed border-foreground/40 p-10 text-center text-sm text-muted-foreground">
          {tag
            ? `Nothing tagged "${tag}" yet.`
            : 'No products listed yet — check back soon.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => {
            const minPrice = minPriceMinorUnits(p);
            const inv = totalInventory(p);
            const out = inv === 0;
            return (
              <Link
                key={p.id}
                href={`/${orgSlug}/product/${p.id}`}
                className="group relative block border-2 border-foreground bg-card p-3 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--primary)]"
              >
                <div className="relative aspect-square overflow-hidden border-2 border-foreground bg-muted">
                  {p.image_paths[0] ? (
                    <Image
                      src={p.image_paths[0]}
                      alt={p.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-3xl text-muted-foreground/50">
                      ?
                    </div>
                  )}
                  {out ? (
                    <Badge
                      variant="warn"
                      className="absolute left-2 top-2"
                    >
                      Out of stock
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 space-y-1">
                  <div className="font-heading text-sm font-bold uppercase leading-tight">
                    {p.name}
                  </div>
                  <div className="flex items-baseline gap-1.5 text-sm">
                    {isMultiVariant(p) ? (
                      <>
                        <span className="label-mono text-muted-foreground">from</span>
                        <span className="font-heading font-bold tabular-nums">
                          <Money amount={minPrice} currency={currency} />
                        </span>
                      </>
                    ) : (
                      <span className="font-heading font-bold tabular-nums">
                        <Money amount={minPrice} currency={currency} />
                      </span>
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
                ? 'border-2 border-foreground bg-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-background'
                : 'border-2 border-foreground bg-transparent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          >
            {t}
          </Link>
        );
      })}
    </div>
  );
}
