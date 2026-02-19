import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import { items } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { formatCurrency } from "@/lib/utils";
import { getSignedUrl } from "@/lib/storage/supabase";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { ImageGallery } from "@/components/store/image-gallery";
import { Markdown } from "@/components/ui/markdown";

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

  // Resolve ALL image URLs for gallery
  const urls = item.imageUrls as string[] | null;
  const resolvedImages: { url: string; alt: string }[] = [];
  if (urls && urls.length > 0) {
    for (const path of urls) {
      try {
        const signedUrl = await getSignedUrl(path);
        if (signedUrl) {
          resolvedImages.push({ url: signedUrl, alt: item.name });
        }
      } catch {
        // Skip failed URLs
      }
    }
  }

  const outOfStock = item.stockQuantity !== null && item.stockQuantity === 0;
  const firstImageUrl = resolvedImages.length > 0 ? resolvedImages[0].url : null;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image Gallery */}
      <ImageGallery images={resolvedImages} />

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
          <div className="mt-6">
            <Markdown content={item.description} />
          </div>
        )}

        <div className="mt-8">
          <AddToCartButton
            item={{
              id: item.id,
              name: item.name,
              slug: item.slug,
              price: item.price,
              imageUrl: firstImageUrl,
              stockQuantity: item.stockQuantity,
            }}
            disabled={outOfStock}
          />
        </div>
      </div>
    </div>
  );
}
