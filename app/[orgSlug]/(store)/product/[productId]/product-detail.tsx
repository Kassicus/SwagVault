'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted/30">
          {mainImage ? (
            <Image
              src={mainImage}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : null}
        </div>
        {product.image_paths.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto">
            {product.image_paths.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setMainImage(url)}
                aria-pressed={url === mainImage}
                className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                  url === mainImage ? 'ring-2 ring-foreground' : ''
                }`}
              >
                <Image src={url} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {product.name}
          </h1>
          {selected ? (
            <div className="text-xl font-semibold">
              <Money amount={selected.price_minor_units} currency={currency} />
            </div>
          ) : null}
        </div>

        {product.description ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        {isMultiVariant ? (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Options
            </div>
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
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : oos
                          ? 'border-dashed text-muted-foreground line-through'
                          : 'hover:border-foreground'
                    }`}
                  >
                    {v.display}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          {selected ? (
            <div className="text-xs text-muted-foreground">
              {selected.inventory_count > 0
                ? `${selected.inventory_count} in stock`
                : 'Out of stock'}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Unavailable</div>
          )}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              disabled={!selected || selected.inventory_count === 0}
              onClick={handleAdd}
            >
              {added ? 'Added!' : 'Add to cart'}
            </Button>
            {added ? (
              <Link
                href={`/${slug}/cart`}
                className="text-sm underline"
              >
                View cart
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
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
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
