'use server';

import { requireOrg } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { variantDisplayName } from '@/lib/products/types';

export type HydratedCartItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  variantDisplay: string;
  imagePath: string | null;
  qty: number;
  unitPriceMinorUnits: number;
  inventoryCount: number;
  available: boolean; // product + variant both active and in stock
};

// Resolves a list of {variantId, qty} into the live product/variant data
// the cart / checkout / PDP needs to render. Filters out variants the user
// can't see (RLS handles this implicitly).
export async function hydrateCart(
  slug: string,
  items: Array<{ variantId: string; qty: number }>,
): Promise<HydratedCartItem[]> {
  const ctx = await requireOrg(slug);
  if (items.length === 0) return [];

  const ids = items.map((i) => i.variantId);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('product_variants')
    .select(
      'id, product_id, name, options, price_minor_units, inventory_count, active, products!inner(name, image_paths, active)',
    )
    .in('id', ids)
    .eq('organization_id', ctx.organizationId);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    product_id: string;
    name: string;
    options: unknown;
    price_minor_units: number;
    inventory_count: number;
    active: boolean;
    products: { name: string; image_paths: string[]; active: boolean };
  }>;

  return items
    .map((item): HydratedCartItem | null => {
      const v = rows.find((r) => r.id === item.variantId);
      if (!v) return null;
      const available = v.active && v.products.active && v.inventory_count > 0;
      return {
        variantId: v.id,
        productId: v.product_id,
        productName: v.products.name,
        variantName: v.name,
        variantDisplay: variantDisplayName({ name: v.name, options: v.options }),
        imagePath: v.products.image_paths[0] ?? null,
        qty: item.qty,
        unitPriceMinorUnits: v.price_minor_units,
        inventoryCount: v.inventory_count,
        available,
      };
    })
    .filter((x): x is HydratedCartItem => x !== null);
}
