"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  id: string;
  variantId?: string;
  selectedOptions?: Record<string, string>;
  name: string;
  slug: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number | null;
  quantity: number;
}

export function cartKey(item: { id: string; variantId?: string }) {
  return item.variantId ? `${item.id}:${item.variantId}` : item.id;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalCost: number;
  currencySymbol: string;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

function getStorageKey(tenantSlug: string) {
  return `swagvault-cart-${tenantSlug}`;
}

export function CartProvider({
  children,
  tenantSlug,
  currencySymbol = "C",
}: {
  children: ReactNode;
  tenantSlug: string;
  currencySymbol?: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(tenantSlug));
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
    setLoaded(true);
  }, [tenantSlug]);

  // Persist to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(items));
  }, [items, tenantSlug, loaded]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setItems((prev) => {
        const key = cartKey(item);
        const existing = prev.find((i) => cartKey(i) === key);
        if (existing) {
          if (
            existing.stockQuantity !== null &&
            existing.quantity >= existing.stockQuantity
          ) {
            return prev; // at stock limit
          }
          return prev.map((i) =>
            cartKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        if (item.stockQuantity !== null && item.stockQuantity <= 0) {
          return prev; // out of stock
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    },
    []
  );

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => cartKey(i) !== key));
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => cartKey(i) !== key));
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (cartKey(i) !== key) return i;
          const capped =
            i.stockQuantity !== null
              ? Math.min(quantity, i.stockQuantity)
              : quantity;
          return { ...i, quantity: capped };
        })
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalCost,
        currencySymbol,
      }}
    >
      {children}
    </CartContext>
  );
}
