import { eq, and, ilike } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { items, categories } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { getOrgSlug } from "@/lib/tenant/context";
import { getCurrentUser } from "@/lib/auth/utils";
import { ItemCard } from "./item-card";
import { getSignedUrl } from "@/lib/storage/supabase";
import { CatalogSearch } from "./catalog-search";

interface StoreCatalogProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export async function StoreCatalog({ searchParams }: StoreCatalogProps) {
  const user = await getCurrentUser();
  if (!user) {
    const slug = await getOrgSlug();
    redirect(slug ? `/login?tenant=${slug}` : "/login");
  }

  const org = await getResolvedTenant();

  const searchQuery = (searchParams.q as string) ?? "";
  const categorySlug = (searchParams.category as string) ?? "";

  // Fetch categories for filter pills
  const allCategories = await withTenant(org.id, async (tx) => {
    return tx
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.tenantId, org.id))
      .orderBy(categories.sortOrder);
  });

  // Build item query with filters
  const allItems = await withTenant(org.id, async (tx) => {
    const conditions = [
      eq(items.tenantId, org.id),
      eq(items.isActive, true),
    ];

    if (searchQuery) {
      conditions.push(ilike(items.name, `%${searchQuery}%`));
    }

    if (categorySlug) {
      const cat = allCategories.find((c) => c.slug === categorySlug);
      if (cat) {
        conditions.push(eq(items.categoryId, cat.id));
      }
    }

    return tx
      .select()
      .from(items)
      .where(and(...conditions))
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

  const tenant = searchParams.tenant as string | undefined;
  const baseQs = tenant ? `tenant=${tenant}` : "";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">The Vault</h1>

      <CatalogSearch
        defaultQuery={searchQuery}
        categories={allCategories}
        activeCategory={categorySlug}
        baseQs={baseQs}
      />

      {itemsWithUrls.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>
            {searchQuery || categorySlug
              ? "No items match your search."
              : "No items available yet. Check back soon!"}
          </p>
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
