// Client-side cart state in localStorage, keyed per org.
// Items are just {variantId, qty} — product/variant data is hydrated at render
// time so price/availability is always live, never cached.

import { useEffect, useState } from 'react';

export type CartItem = { variantId: string; qty: number };
export type Cart = { items: CartItem[]; updatedAt: number };

const KEY = (orgId: string) => `swagvault_cart_${orgId}`;

function read(orgId: string): Cart {
  if (typeof window === 'undefined') return { items: [], updatedAt: 0 };
  try {
    const raw = window.localStorage.getItem(KEY(orgId));
    if (!raw) return { items: [], updatedAt: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) {
      return { items: [], updatedAt: 0 };
    }
    return {
      items: parsed.items
        .filter(
          (i: unknown): i is CartItem =>
            !!i &&
            typeof i === 'object' &&
            typeof (i as CartItem).variantId === 'string' &&
            Number.isInteger((i as CartItem).qty) &&
            (i as CartItem).qty > 0,
        )
        .slice(0, 100),
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return { items: [], updatedAt: 0 };
  }
}

function write(orgId: string, cart: Cart) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY(orgId), JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent('swagvault:cart', { detail: { orgId } }));
}

export function addToCart(orgId: string, variantId: string, qty = 1) {
  const cart = read(orgId);
  const existing = cart.items.find((i) => i.variantId === variantId);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + qty);
  } else {
    cart.items.push({ variantId, qty: Math.max(1, Math.min(99, qty)) });
  }
  cart.updatedAt = Date.now();
  write(orgId, cart);
}

export function setQty(orgId: string, variantId: string, qty: number) {
  const cart = read(orgId);
  cart.items = cart.items
    .map((i) => (i.variantId === variantId ? { ...i, qty } : i))
    .filter((i) => i.qty > 0);
  cart.updatedAt = Date.now();
  write(orgId, cart);
}

export function removeFromCart(orgId: string, variantId: string) {
  const cart = read(orgId);
  cart.items = cart.items.filter((i) => i.variantId !== variantId);
  cart.updatedAt = Date.now();
  write(orgId, cart);
}

export function clearCart(orgId: string) {
  write(orgId, { items: [], updatedAt: Date.now() });
}

// React hook: returns the live cart, listening to localStorage changes from
// any tab and the in-tab CustomEvent we fire on writes.
//
// The lazy initializer reads localStorage on the client (server returns the
// empty default). SSR will hydrate with cart={} and the first client render
// captures the real cart immediately, so we don't need to setState inside the
// effect — only the event handlers (which run after render) do that.
export function useCart(orgId: string): Cart {
  const [cart, setCart] = useState<Cart>(() => read(orgId));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY(orgId)) setCart(read(orgId));
    };
    const onCustom = (e: Event) => {
      const ev = e as CustomEvent<{ orgId: string }>;
      if (ev.detail?.orgId === orgId) setCart(read(orgId));
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('swagvault:cart', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('swagvault:cart', onCustom);
    };
  }, [orgId]);

  return cart;
}
