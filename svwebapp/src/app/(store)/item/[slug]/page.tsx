import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import { items } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { formatCurrency } from "@/lib/utils";
import { getSignedUrl } from "@/lib/storage/supabase";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getResolvedTenant();

  const item = await withTenant(org.id, async (tx) => {
    const [found] = await tx
      .select()
      .from(items)
      .where(
        and(
          eq(items.tenantId, org.id),
          eq(items.slug, slug),
          eq(items.isActive, true)
        )
      );
    return found;
  });

  if (!item) notFound();

  let imageUrl: string | null = null;
  const urls = item.imageUrls as string[] | null;
  if (urls && urls.length > 0) {
    try {
      imageUrl = await getSignedUrl(urls[0]);
    } catch {
      // Ignore
    }
  }

  const outOfStock = item.stockQuantity !== null && item.stockQuantity === 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image */}
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v13.5a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div>
        <h1 className="text-3xl font-bold">{item.name}</h1>

        <div className="mt-4 flex items-center gap-3">
          <span className="text-3xl font-bold text-primary">
            {formatCurrency(item.price, org.currencySymbol ?? "C")}
          </span>
          {outOfStock && <Badge variant="destructive">Out of Stock</Badge>}
          {item.stockQuantity !== null && item.stockQuantity > 0 && (
            <Badge variant="secondary">{item.stockQuantity} left</Badge>
          )}
        </div>

        {item.description && (
          <div className="mt-6 text-muted-foreground">
            <p className="whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        <div className="mt-8">
          <AddToCartButton
            item={{
              id: item.id,
              name: item.name,
              slug: item.slug,
              price: item.price,
              imageUrl: imageUrl,
              stockQuantity: item.stockQuantity,
            }}
            disabled={outOfStock}
          />
        </div>
      </div>
    </div>
  );
}
