'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
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
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Your cart is empty.
        </div>
        <Link href={`/${slug}`} className="text-sm underline">
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
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cart</h1>
        <div className="divide-y rounded-lg border">
          {items.map((i) => (
            <CartRow
              key={i.variantId}
              item={i}
              currency={currency}
              onQty={(q) => setQty(orgId, i.variantId, q)}
              onRemove={() => removeFromCart(orgId, i.variantId)}
            />
          ))}
        </div>
        {hasUnavailable ? (
          <p className="text-sm text-destructive">
            One or more items are unavailable. Remove them to continue.
          </p>
        ) : null}
      </div>
      <aside className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Summary</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <Money amount={subtotal} currency={currency} />
        </div>
        <Link
          href={hasUnavailable ? '#' : `/${slug}/checkout`}
          aria-disabled={hasUnavailable}
          className={
            hasUnavailable
              ? 'block w-full cursor-not-allowed rounded-lg bg-muted px-4 py-2 text-center text-sm text-muted-foreground'
              : 'block w-full rounded-lg bg-foreground px-4 py-2 text-center text-sm font-medium text-background hover:bg-foreground/90'
          }
        >
          Checkout
        </Link>
      </aside>
    </div>
  );
}

function CartRow({
  item,
  currency,
  onQty,
  onRemove,
}: {
  item: HydratedCartItem;
  currency: CurrencyConfig;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  const cap = Math.max(1, item.inventoryCount);
  return (
    <div className="flex gap-4 p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded border bg-muted/30">
        {item.imagePath ? (
          <Image src={item.imagePath} alt="" fill sizes="80px" className="object-cover" />
        ) : null}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{item.productName}</div>
            {item.variantDisplay && item.variantDisplay !== 'default' ? (
              <div className="text-xs text-muted-foreground">
                {item.variantDisplay}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Remove
          </button>
        </div>
        {!item.available ? (
          <div className="text-xs text-destructive">Out of stock</div>
        ) : null}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => onQty(Math.max(1, item.qty - 1))}
              disabled={item.qty <= 1}
            >
              −
            </Button>
            <span className="min-w-7 text-center tabular-nums text-sm">
              {item.qty}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => onQty(Math.min(cap, item.qty + 1))}
              disabled={item.qty >= cap}
            >
              +
            </Button>
          </div>
          <div className="text-sm font-medium">
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
