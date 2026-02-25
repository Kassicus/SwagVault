"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/hooks/use-cart";

export function CartProviderWrapper({
  children,
  tenantSlug,
  currencySymbol,
}: {
  children: ReactNode;
  tenantSlug: string;
  currencySymbol: string;
}) {
  return (
    <CartProvider tenantSlug={tenantSlug} currencySymbol={currencySymbol}>
      {children}
    </CartProvider>
  );
}
