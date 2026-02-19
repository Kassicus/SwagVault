"use client";

import { Button } from "@/components/ui/button";
import { useCart, type CartItem } from "@/hooks/use-cart";

interface AddToCartButtonProps {
  item: Omit<CartItem, "quantity">;
  disabled?: boolean;
}

export function AddToCartButton({ item, disabled }: AddToCartButtonProps) {
  const { addItem, items } = useCart();

  const inCart = items.find((i) => i.id === item.id);

  function handleClick() {
    addItem(item);
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      size="lg"
      className="w-full md:w-auto"
    >
      {disabled
        ? "Out of Stock"
        : inCart
          ? `Add Another (${inCart.quantity} in cart)`
          : "Add to Cart"}
    </Button>
  );
}
