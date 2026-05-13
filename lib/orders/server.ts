import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type OrderRow = Database['public']['Tables']['orders']['Row'];
export type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
export type OrderWithItems = OrderRow & {
  items: OrderItemRow[];
  product_image_paths: Record<string, string | null>;
};

export const listUserOrders = cache(
  async (organizationId: string, userId: string): Promise<OrderRow[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);

export const getOrder = cache(
  async (
    organizationId: string,
    orderId: string,
    userId: string,
  ): Promise<OrderWithItems | null> => {
    const supabase = await createSupabaseServerClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('organization_id', organizationId)
      .eq('id', orderId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    const row = order as unknown as OrderRow & { order_items: OrderItemRow[] };
    const items = row.order_items;

    // Fetch product images for thumbnails (RLS allows reads on active products
    // for members; admin view is broader, but this is the storefront path).
    const productIds = Array.from(
      new Set(items.map((i) => i.product_id).filter((x): x is string => !!x)),
    );
    const product_image_paths: Record<string, string | null> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, image_paths')
        .in('id', productIds);
      for (const p of products ?? []) {
        product_image_paths[p.id] = p.image_paths[0] ?? null;
      }
    }

    const { order_items: _omit, ...rest } = row;
    void _omit;
    return { ...rest, items, product_image_paths };
  },
);

export type TransactionRow =
  Database['public']['Tables']['transactions']['Row'];

export const listUserTransactions = cache(
  async (
    organizationId: string,
    userId: string,
    limit = 25,
  ): Promise<TransactionRow[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  },
);
