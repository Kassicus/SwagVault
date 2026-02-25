"use client";

import { Button } from "@/components/ui/button";
import { useCart, cartKey, type CartItem } from "@/hooks/use-cart";

interface AddToCartButtonProps {
  item: Omit<CartItem, "quantity">;
  disabled?: boolean;
  label?: string;
}

export function AddToCartButton({ item, disabled, label }: AddToCartButtonProps) {
  const { addItem, items } = useCart();

  const key = cartKey(item);
  const inCart = items.find((i) => cartKey(i) === key);

  const atStockLimit =
    item.stockQuantity !== null &&
    inCart !== undefined &&
    inCart.quantity >= item.stockQuantity;

  function handleClick() {
    addItem(item);
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || atStockLimit}
      size="lg"
      className="w-full md:w-auto"
    >
      {label
        ? label
        : disabled
          ? "Out of Stock"
          : atStockLimit
            ? `Max in Cart (${inCart!.quantity})`
            : inCart
              ? `Add Another (${inCart.quantity} in cart)`
              : "Add to Cart"}
    </Button>
  );
}
