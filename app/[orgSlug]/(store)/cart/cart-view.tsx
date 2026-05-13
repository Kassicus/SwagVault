'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Money } from '@/lib/currency/money';
import type { CurrencyConfig } from '@/lib/currency/format';
import { hydrateCart, type HydratedCartItem } from '@/lib/cart/server';
import {
  removeFromCart,
  setQty,
  useCart,
} from '@/lib/cart/store';

export function CartView({
  slug,
  orgId,
  currency,
}: {
  slug: string;
  orgId: string;
  currency: CurrencyConfig;
}) {
  const cart = useCart(orgId);
  const [items, setItems] = useState<HydratedCartItem[] | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await hydrateCart(slug, cart.items);
      setItems(result);
    });
  }, [cart, slug]);

  if (items === null) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <p className="label-mono text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <div className="border-2 border-dashed border-foreground/40 p-12 text-center">
          <p className="font-heading text-2xl font-bold uppercase">
            Cart&apos;s empty.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Go grab something good.
          </p>
        </div>
        <Link
          href={`/${slug}`}
          className="label-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          ← Back to store
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, i) => sum + i.unitPriceMinorUnits * i.qty,
    0,
  );
  const hasUnavailable = items.some((i) => !i.available);

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <PageHeader />
        <div className="border-2 border-foreground bg-card">
          {items.map((i, idx) => (
            <CartRow
              key={i.variantId}
              item={i}
              currency={currency}
              isLast={idx === items.length - 1}
              onQty={(q) => setQty(orgId, i.variantId, q)}
              onRemove={() => removeFromCart(orgId, i.variantId)}
            />
          ))}
        </div>
        {hasUnavailable ? (
          <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
            ⚠ One or more items are unavailable. Remove them to continue.
          </p>
        ) : null}
      </div>
      <aside className="space-y-4 border-2 border-foreground bg-card p-5 shadow-[5px_5px_0_0_var(--primary)] md:sticky md:top-6 md:self-start">
        <h2 className="font-heading text-xl font-bold uppercase">Summary</h2>
        <div className="flex items-center justify-between border-t-2 border-foreground/10 pt-4 text-sm">
          <span className="label-mono text-muted-foreground">Subtotal</span>
          <span className="font-heading text-xl font-bold tabular-nums">
            <Money amount={subtotal} currency={currency} />
          </span>
        </div>
        {hasUnavailable ? (
          <Button disabled className="w-full" size="lg">
            Checkout
          </Button>
        ) : (
          <Link
            href={`/${slug}/checkout`}
            className="block w-full border-2 border-foreground bg-primary py-3 text-center font-heading text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0_0_var(--foreground)] transition-all hover:bg-primary/90 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
          >
            Checkout →
          </Link>
        )}
      </aside>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="label-mono text-muted-foreground">{'// Cart'}</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
        Your loot
      </h1>
    </div>
  );
}

function CartRow({
  item,
  currency,
  isLast,
  onQty,
  onRemove,
}: {
  item: HydratedCartItem;
  currency: CurrencyConfig;
  isLast: boolean;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  const cap = Math.max(1, item.inventoryCount);
  return (
    <div
      className={`flex gap-4 p-4 ${isLast ? '' : 'border-b-2 border-foreground/10'}`}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden border-2 border-foreground bg-muted">
        {item.imagePath ? (
          <Image src={item.imagePath} alt="" fill sizes="80px" className="object-cover" />
        ) : null}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-heading text-sm font-bold uppercase">
              {item.productName}
            </div>
            {item.variantDisplay && item.variantDisplay !== 'default' ? (
              <div className="label-mono text-muted-foreground">
                {item.variantDisplay}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="label-mono text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
        {!item.available ? (
          <Badge variant="warn">Out of stock</Badge>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center border-2 border-foreground">
            <button
              type="button"
              onClick={() => onQty(Math.max(1, item.qty - 1))}
              disabled={item.qty <= 1}
              className="grid size-8 place-items-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="grid size-8 place-items-center border-x-2 border-foreground bg-card font-heading font-bold tabular-nums">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => onQty(Math.min(cap, item.qty + 1))}
              disabled={item.qty >= cap}
              className="grid size-8 place-items-center text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <div className="font-heading text-base font-bold tabular-nums">
            <Money
              amount={item.unitPriceMinorUnits * item.qty}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
