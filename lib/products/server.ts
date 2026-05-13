import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type ProductRow = Database['public']['Tables']['products']['Row'];
export type VariantRow = Database['public']['Tables']['product_variants']['Row'];
export type ProductWithVariants = ProductRow & { variants: VariantRow[] };

// List products for a given org. Pass `adminView=true` to include inactive
// products (admins see them all; members only see active via RLS).
export const listProducts = cache(
  async (
    organizationId: string,
    opts: { adminView?: boolean; tag?: string } = {},
  ): Promise<ProductWithVariants[]> => {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (!opts.adminView) {
      query = query.eq('active', true);
    }
    if (opts.tag) {
      query = query.contains('tags', [opts.tag]);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as Array<
      ProductRow & { product_variants: VariantRow[] }
    >;
    return rows.map((p) => {
      const { product_variants, ...rest } = p;
      const variants = [...product_variants].sort(
        (a, b) => a.position - b.position,
      );
      return { ...rest, variants };
    });
  },
);

export const getProductWithVariants = cache(
  async (
    organizationId: string,
    productId: string,
    opts: { adminView?: boolean } = {},
  ): Promise<ProductWithVariants | null> => {
    const supabase = await createSupabaseServerClient();
    const query = supabase
      .from('products')
      .select('*, product_variants(*)')
      .eq('organization_id', organizationId)
      .eq('id', productId)
      .maybeSingle();

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as unknown as ProductRow & {
      product_variants: VariantRow[];
    };
    if (!opts.adminView && !row.active) return null;

    const { product_variants, ...rest } = row;
    const variants = [...product_variants].sort(
      (a, b) => a.position - b.position,
    );
    return { ...rest, variants };
  },
);

export function isMultiVariant(p: ProductWithVariants): boolean {
  return p.variants.length > 1;
}

// Sum of inventory across active variants — what the admin list shows.
export function totalInventory(p: ProductWithVariants): number {
  return p.variants.reduce(
    (sum, v) => sum + (v.active ? v.inventory_count : 0),
    0,
  );
}

// Minimum price across active variants — what the grid shows as "from $X".
export function minPriceMinorUnits(p: ProductWithVariants): number {
  const prices = p.variants.filter((v) => v.active).map((v) => v.price_minor_units);
  return prices.length ? Math.min(...prices) : 0;
}
