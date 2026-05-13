'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Money } from '@/lib/currency/money';
import type { CurrencyConfig } from '@/lib/currency/format';
import {
  clearCart,
  useCart,
} from '@/lib/cart/store';
import { hydrateCart, type HydratedCartItem } from '@/lib/cart/server';
import { placeOrderAction } from './actions';
import type { FulfillmentMethod, FulfillmentMode } from '@/lib/supabase/types';

export function CheckoutView({
  slug,
  orgId,
  fulfillmentMode,
  currency,
}: {
  slug: string;
  orgId: string;
  fulfillmentMode: FulfillmentMode;
  currency: CurrencyConfig;
}) {
  const router = useRouter();
  const cart = useCart(orgId);
  const [items, setItems] = useState<HydratedCartItem[] | null>(null);
  const [, startHydrate] = useTransition();

  const [method, setMethod] = useState<FulfillmentMethod>(
    fulfillmentMode === 'shipping' ? 'shipping' : 'pickup',
  );
  const [address, setAddress] = useState({
    recipient: '',
    line1: '',
    line2: '',
    city: '',
    region: '',
    postal_code: '',
    country: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    startHydrate(async () => {
      const result = await hydrateCart(slug, cart.items);
      setItems(result);
    });
  }, [cart, slug]);

  if (items === null) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link href={`/${slug}`} className="text-sm underline">
          ← Back to store
        </Link>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.unitPriceMinorUnits * i.qty, 0);
  const hasUnavailable = items.some((i) => !i.available);

  async function handlePlace() {
    setError(null);
    if (hasUnavailable) {
      setError(
        'Remove unavailable items from your cart before placing the order.',
      );
      return;
    }
    if (method === 'shipping') {
      if (!address.line1 || !address.city || !address.postal_code) {
        setError(
          'Please fill in at least street, city, and postal code.',
        );
        return;
      }
    }

    setSubmitting(true);
    const result = await placeOrderAction({
      slug,
      items: (items ?? []).map((i) => ({
        variantId: i.variantId,
        qty: i.qty,
      })),
      fulfillment: method,
      shippingAddress: method === 'shipping' ? address : null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    clearCart(orgId);
    router.push(`/${slug}/orders/${result.orderId}?just_placed=1`);
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>

        {fulfillmentMode === 'both' ? (
          <FulfillmentSwitcher value={method} onChange={setMethod} />
        ) : null}

        {method === 'shipping' ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Shipping address</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="recipient"
                label="Recipient name"
                value={address.recipient}
                onChange={(v) => setAddress({ ...address, recipient: v })}
                placeholder="Jane Doe"
              />
              <Field
                id="line1"
                label="Street"
                value={address.line1}
                onChange={(v) => setAddress({ ...address, line1: v })}
                placeholder="123 Main St"
                required
              />
              <Field
                id="line2"
                label="Apt / Suite"
                value={address.line2}
                onChange={(v) => setAddress({ ...address, line2: v })}
              />
              <Field
                id="city"
                label="City"
                value={address.city}
                onChange={(v) => setAddress({ ...address, city: v })}
                required
              />
              <Field
                id="region"
                label="State / Region"
                value={address.region}
                onChange={(v) => setAddress({ ...address, region: v })}
              />
              <Field
                id="postal_code"
                label="Postal code"
                value={address.postal_code}
                onChange={(v) => setAddress({ ...address, postal_code: v })}
                required
              />
              <Field
                id="country"
                label="Country"
                value={address.country}
                onChange={(v) => setAddress({ ...address, country: v })}
                placeholder="USA"
              />
            </div>
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Pickup</h2>
            <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Items will be picked up at your organization&rsquo;s designated
              location.
            </p>
          </section>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center gap-3">
          <Button onClick={handlePlace} disabled={submitting || hasUnavailable}>
            {submitting ? 'Placing order…' : 'Place order'}
          </Button>
          <Link
            href={`/${slug}/cart`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to cart
          </Link>
        </div>
      </div>

      <aside className="space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Order summary</h2>
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={i.variantId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded border bg-muted/30">
                {i.imagePath ? (
                  <Image
                    src={i.imagePath}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium">{i.productName}</div>
                {i.variantDisplay && i.variantDisplay !== 'default' ? (
                  <div className="text-xs text-muted-foreground">
                    {i.variantDisplay}
                  </div>
                ) : null}
                <div className="text-xs text-muted-foreground">× {i.qty}</div>
              </div>
              <div className="text-sm font-medium tabular-nums">
                <Money
                  amount={i.unitPriceMinorUnits * i.qty}
                  currency={currency}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t pt-3 text-sm font-medium">
          <span>Total</span>
          <Money amount={total} currency={currency} />
        </div>
      </aside>
    </div>
  );
}

function FulfillmentSwitcher({
  value,
  onChange,
}: {
  value: FulfillmentMethod;
  onChange: (v: FulfillmentMethod) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['pickup', 'shipping'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={value === m}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
            value === m
              ? 'border-foreground bg-muted/40'
              : 'border-border hover:bg-muted/30'
          }`}
        >
          <div className="font-medium">
            {m === 'pickup' ? 'Pick up at office' : 'Ship to me'}
          </div>
          <div className="text-xs text-muted-foreground">
            {m === 'pickup'
              ? 'Grab it from your org’s pickup spot.'
              : 'Enter an address for delivery.'}
          </div>
        </button>
      ))}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
