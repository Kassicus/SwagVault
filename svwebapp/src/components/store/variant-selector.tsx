"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { formatCurrency } from "@/lib/utils";

interface OptionGroup {
  name: string;
  values: string[];
}

interface Variant {
  id: string;
  options: Record<string, string>;
  stockQuantity: number | null;
  priceOverride: number | null;
  isActive: boolean;
}

interface VariantSelectorProps {
  item: {
    id: string;
    name: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    stockQuantity: number | null;
  };
  optionGroups: OptionGroup[];
  variants: Variant[];
  currencySymbol: string;
}

export function VariantSelector({
  item,
  optionGroups,
  variants,
  currencySymbol,
}: VariantSelectorProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});

  const allSelected = optionGroups.every((g) => selections[g.name]);

  const matchedVariant = useMemo(() => {
    if (!allSelected) return null;
    return variants.find(
      (v) =>
        v.isActive &&
        optionGroups.every((g) => v.options[g.name] === selections[g.name])
    ) ?? null;
  }, [selections, allSelected, variants, optionGroups]);

  const effectivePrice = matchedVariant?.priceOverride ?? item.price;
  const effectiveStock = matchedVariant?.stockQuantity ?? null;
  const outOfStock = matchedVariant ? effectiveStock !== null && effectiveStock <= 0 : false;

  return (
    <div className="space-y-4">
      {optionGroups.map((group) => (
        <div key={group.name} className="space-y-2">
          <p className="text-sm font-medium">{group.name}</p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((val) => {
              const isSelected = selections[group.name] === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() =>
                    setSelections((prev) => ({ ...prev, [group.name]: val }))
                  }
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {allSelected && matchedVariant && (
        <div className="flex items-center gap-3">
          {matchedVariant.priceOverride !== null &&
            matchedVariant.priceOverride !== item.price && (
              <span className="text-lg font-bold text-primary">
                {formatCurrency(matchedVariant.priceOverride, currencySymbol)}
              </span>
            )}
          {effectiveStock !== null && effectiveStock > 0 && (
            <Badge variant="secondary">{effectiveStock} left</Badge>
          )}
          {outOfStock && <Badge variant="destructive">Out of Stock</Badge>}
        </div>
      )}

      <AddToCartButton
        item={{
          id: item.id,
          name: item.name,
          slug: item.slug,
          price: effectivePrice,
          imageUrl: item.imageUrl,
          stockQuantity: effectiveStock,
          variantId: matchedVariant?.id,
          selectedOptions: allSelected ? selections : undefined,
        }}
        disabled={!allSelected || outOfStock}
        label={!allSelected ? "Select options" : undefined}
      />
    </div>
  );
}
