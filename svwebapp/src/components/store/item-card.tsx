import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface ItemCardProps {
  name: string;
  slug: string;
  price: number;
  currencySymbol: string;
  imageUrl?: string | null;
  stockQuantity: number | null;
  isActive: boolean;
}

export function ItemCard({
  name,
  slug,
  price,
  currencySymbol,
  imageUrl,
  stockQuantity,
}: ItemCardProps) {
  const outOfStock = stockQuantity !== null && stockQuantity === 0;

  return (
    <Link
      href={`/item/${slug}`}
      className="group rounded-lg border border-border bg-card transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden rounded-t-lg bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-card-foreground group-hover:text-primary">
          {name}
        </h3>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(price, currencySymbol)}
          </span>
          {stockQuantity !== null && stockQuantity > 0 && (
            <span className="text-xs text-muted-foreground">
              {stockQuantity} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
