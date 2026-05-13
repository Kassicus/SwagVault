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
    return <p className="label-mono text-muted-foreground">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <p className="text-sm text-muted-foreground">Your cart is empty.</p>
        <Link
          href={`/${slug}`}
          className="label-mono text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
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
      <div className="space-y-8">
        <PageHeader />

        {fulfillmentMode === 'both' ? (
          <FulfillmentSwitcher value={method} onChange={setMethod} />
        ) : null}

        {method === 'shipping' ? (
          <section className="space-y-4">
            <h2 className="font-heading text-lg font-bold uppercase">
              Shipping address
            </h2>
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
          <section className="space-y-3">
            <h2 className="font-heading text-lg font-bold uppercase">Pickup</h2>
            <p className="border-2 border-foreground bg-muted p-4 text-sm text-muted-foreground">
              Items will be picked up at your organization&rsquo;s designated
              location.
            </p>
          </section>
        )}

        {error ? (
          <p className="border-2 border-destructive bg-destructive/15 px-3 py-2 text-sm font-bold text-destructive">
            ⚠ {error}
          </p>
        ) : null}

        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={handlePlace}
            disabled={submitting || hasUnavailable}
          >
            {submitting ? 'Placing order…' : 'Place order →'}
          </Button>
          <Link
            href={`/${slug}/cart`}
            className="label-mono text-muted-foreground hover:text-foreground"
          >
            ← Back to cart
          </Link>
        </div>
      </div>

      <aside className="space-y-4 border-2 border-foreground bg-card p-5 shadow-[5px_5px_0_0_var(--secondary)] md:sticky md:top-6 md:self-start">
        <h2 className="font-heading text-xl font-bold uppercase">
          Order summary
        </h2>
        <ul className="space-y-3 border-t-2 border-foreground/10 pt-4">
          {items.map((i) => (
            <li key={i.variantId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden border-2 border-foreground bg-muted">
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
                <div className="font-heading font-bold uppercase text-xs leading-tight">
                  {i.productName}
                </div>
                {i.variantDisplay && i.variantDisplay !== 'default' ? (
                  <div className="label-mono text-muted-foreground">
                    {i.variantDisplay}
                  </div>
                ) : null}
                <div className="label-mono text-muted-foreground">× {i.qty}</div>
              </div>
              <div className="font-heading text-sm font-bold tabular-nums">
                <Money
                  amount={i.unitPriceMinorUnits * i.qty}
                  currency={currency}
                />
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-foreground pt-3">
          <span className="label-mono">Total</span>
          <span className="font-heading text-2xl font-black tabular-nums">
            <Money amount={total} currency={currency} />
          </span>
        </div>
      </aside>
    </div>
  );
}

function PageHeader() {
  return (
    <div>
      <p className="label-mono text-muted-foreground">{'// Final step'}</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
        Checkout
      </h1>
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
    <div className="grid grid-cols-2 gap-3">
      {(['pickup', 'shipping'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={value === m}
          className={`border-2 border-foreground px-4 py-3 text-left transition-all ${
            value === m
              ? 'bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--foreground)]'
              : 'bg-card hover:bg-muted'
          }`}
        >
          <div className="font-heading text-sm font-bold uppercase">
            {m === 'pickup' ? 'Pick up' : 'Ship to me'}
          </div>
          <div
            className={`mt-1 text-xs ${
              value === m
                ? 'text-primary-foreground/70'
                : 'text-muted-foreground'
            }`}
          >
            {m === 'pickup'
              ? 'Grab it from your office.'
              : 'Enter an address.'}
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
        {required ? <span className="text-secondary"> *</span> : null}
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
