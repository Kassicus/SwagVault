"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart, cartKey } from "@/hooks/use-cart";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { placeOrder } from "./actions";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalCost, currencySymbol } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handlePlaceOrder() {
    setError("");
    startTransition(async () => {
      const lineItems = items.map((item) => ({
        itemId: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
      }));

      const result = await placeOrder(lineItems);

      if (result.success) {
        clearCart();
        router.push(`/orders/${result.orderId}`);
      } else {
        setError(result.error ?? "Failed to place order");
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <p className="mt-2 text-muted-foreground">Your cart is empty</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/")}
        >
          Browse Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Your Cart</h1>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="divide-y divide-border">
          {items.map((item) => {
            const key = cartKey(item);
            return (
              <div
                key={key}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-md bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.selectedOptions && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.selectedOptions)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price, currencySymbol)} each
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(key, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(key, item.quantity + 1)}
                      disabled={item.stockQuantity !== null && item.quantity >= item.stockQuantity}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-20 text-right font-medium">
                    {formatCurrency(item.price * item.quantity, currencySymbol)}
                  </span>
                  <button
                    onClick={() => removeItem(key)}
                    className="p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mt-4">
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCost, currencySymbol)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
            <Button onClick={handlePlaceOrder} loading={isPending} size="lg">
              Claim Items
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
