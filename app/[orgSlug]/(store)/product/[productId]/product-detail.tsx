'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/lib/currency/money';
import type { CurrencyConfig } from '@/lib/currency/format';
import type { ProductWithVariants } from '@/lib/products/server';
import { addToCart } from '@/lib/cart/store';

type VariantDisplay = {
  id: string;
  name: string;
  display: string;
  price_minor_units: number;
  inventory_count: number;
};

export function ProductDetail({
  slug,
  orgId,
  product,
  activeVariants,
  currency,
}: {
  slug: string;
  orgId: string;
  product: ProductWithVariants;
  activeVariants: VariantDisplay[];
  currency: CurrencyConfig;
}) {
  const [mainImage, setMainImage] = useState(product.image_paths[0] ?? null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    activeVariants[0]?.id ?? null,
  );
  const [added, setAdded] = useState(false);

  const selected =
    activeVariants.find((v) => v.id === selectedVariantId) ?? activeVariants[0];
  const isMultiVariant = activeVariants.length > 1;

  function handleAdd() {
    if (!selected || selected.inventory_count === 0) return;
    addToCart(orgId, selected.id, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden border-2 border-foreground bg-muted shadow-[5px_5px_0_0_var(--foreground)]">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="grid h-full place-items-center text-6xl text-muted-foreground/40">
              ?
            </div>
          )}
        </div>
        {product.image_paths.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pt-1">
            {product.image_paths.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setMainImage(url)}
                aria-pressed={url === mainImage}
                className={`relative h-16 w-16 shrink-0 overflow-hidden border-2 transition-colors ${
                  url === mainImage
                    ? 'border-primary bg-primary'
                    : 'border-foreground hover:border-primary'
                }`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <p className="label-mono text-muted-foreground">{'// Product'}</p>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight">
            {product.name}
          </h1>
          {selected ? (
            <div className="flex items-baseline gap-3">
              <div className="font-heading text-3xl font-black tabular-nums">
                <Money amount={selected.price_minor_units} currency={currency} />
              </div>
              <span className="label-mono text-muted-foreground">
                / unit
              </span>
            </div>
          ) : null}
        </div>

        {product.description ? (
          <p className="border-l-2 border-secondary pl-4 text-sm text-muted-foreground whitespace-pre-line">
            {product.description}
          </p>
        ) : null}

        {isMultiVariant ? (
          <div className="space-y-2">
            <div className="label-mono text-muted-foreground">Options</div>
            <div className="flex flex-wrap gap-2">
              {activeVariants.map((v) => {
                const oos = v.inventory_count === 0;
                const isSelected = v.id === selectedVariantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    disabled={oos}
                    className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--foreground)]'
                        : oos
                          ? 'border-dashed text-muted-foreground line-through'
                          : 'bg-card hover:bg-muted'
                    }`}
                  >
                    {v.display}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {selected ? (
            <Badge variant={selected.inventory_count > 0 ? 'mint' : 'warn'}>
              {selected.inventory_count > 0
                ? `${selected.inventory_count} in stock`
                : 'Out of stock'}
            </Badge>
          ) : (
            <Badge variant="muted">Unavailable</Badge>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="lg"
              disabled={!selected || selected.inventory_count === 0}
              onClick={handleAdd}
            >
              {added ? '✓ Added' : 'Add to cart'}
            </Button>
            {added ? (
              <Link
                href={`/${slug}/cart`}
                className="label-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
              >
                View cart →
              </Link>
            ) : null}
          </div>
        </div>

        {product.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {product.tags.map((t) => (
              <Link
                key={t}
                href={`/${slug}?tag=${encodeURIComponent(t)}`}
                className="border-2 border-foreground bg-transparent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {t}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
