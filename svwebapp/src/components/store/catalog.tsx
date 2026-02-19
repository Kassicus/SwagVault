import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import { items } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { getOrgSlug } from "@/lib/tenant/context";
import { getCurrentUser } from "@/lib/auth/utils";
import { ItemCard } from "./item-card";
import { getSignedUrl } from "@/lib/storage/supabase";

export async function StoreCatalog() {
  const user = await getCurrentUser();
  if (!user) {
    const slug = await getOrgSlug();
    redirect(slug ? `/login?tenant=${slug}` : "/login");
  }

  const org = await getResolvedTenant();

  const allItems = await withTenant(org.id, async (tx) => {
    return tx
      .select()
      .from(items)
      .where(and(eq(items.tenantId, org.id), eq(items.isActive, true)))
      .orderBy(items.sortOrder, items.createdAt);
  });

  const itemsWithUrls = await Promise.all(
    allItems.map(async (item) => {
      let imageUrl: string | null = null;
      const urls = item.imageUrls as string[] | null;
      if (urls && urls.length > 0) {
        try {
          imageUrl = await getSignedUrl(urls[0]);
        } catch {
          // Ignore
        }
      }
      return { ...item, resolvedImageUrl: imageUrl };
    })
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">The Vault</h1>

      {itemsWithUrls.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No items available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {itemsWithUrls.map((item) => (
            <ItemCard
              key={item.id}
              name={item.name}
              slug={item.slug}
              price={item.price}
              currencySymbol={org.currencySymbol ?? "C"}
              imageUrl={item.resolvedImageUrl}
              stockQuantity={item.stockQuantity}
              isActive={item.isActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
