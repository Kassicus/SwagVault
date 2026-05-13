'use server';

import { revalidatePath } from 'next/cache';
import { requireOrg } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { sendOrderEmails } from '@/lib/email/order';
import type { FulfillmentMethod, Json } from '@/lib/supabase/types';

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string; code?: string };

export async function placeOrderAction(input: {
  slug: string;
  items: Array<{ variantId: string; qty: number }>;
  fulfillment: FulfillmentMethod;
  shippingAddress: Record<string, string> | null;
}): Promise<PlaceOrderResult> {
  const ctx = await requireOrg(input.slug);

  if (input.items.length === 0) {
    return { ok: false, error: 'Your cart is empty.', code: 'EMPTY_CART' };
  }
  if (input.fulfillment === 'shipping' && !input.shippingAddress) {
    return {
      ok: false,
      error: 'Shipping address is required.',
      code: 'MISSING_ADDRESS',
    };
  }
  if (
    input.fulfillment !== ctx.organization.fulfillment_mode &&
    ctx.organization.fulfillment_mode !== 'both'
  ) {
    return {
      ok: false,
      error: 'This org does not support that fulfillment option.',
      code: 'BAD_FULFILLMENT',
    };
  }

  const service = createSupabaseServiceClient();
  const { data: orderId, error } = await service.rpc('place_order', {
    p_organization_id: ctx.organizationId,
    p_user_id: ctx.userId,
    p_items: input.items as unknown as Json,
    p_fulfillment: input.fulfillment,
    p_shipping_address: (input.shippingAddress ?? null) as unknown as Json,
  });

  if (error || !orderId) {
    const msg = error?.message ?? 'Failed to place order.';
    return mapRpcError(msg);
  }

  // Best-effort email — never blocks order success.
  void sendOrderEmails({
    slug: input.slug,
    orderId,
    organizationId: ctx.organizationId,
    organizationName: ctx.organization.name,
    userId: ctx.userId,
  }).catch((e) => {
    console.error('Order email failed:', e);
  });

  revalidatePath(`/${input.slug}`);
  revalidatePath(`/${input.slug}/cart`);
  revalidatePath(`/${input.slug}/orders`);
  revalidatePath(`/${input.slug}/account`);
  return { ok: true, orderId };
}

function mapRpcError(msg: string): PlaceOrderResult {
  // The RPC raises prefixed error codes — surface a friendly message + the
  // affected variant when possible.
  if (msg.includes('INSUFFICIENT_BALANCE')) {
    return {
      ok: false,
      error: "You don't have enough balance for this order.",
      code: 'INSUFFICIENT_BALANCE',
    };
  }
  const oos = msg.match(/OUT_OF_STOCK:([^:]+):(.*)/);
  if (oos) {
    const product = oos[1];
    const variant = oos[2];
    return {
      ok: false,
      error: variant
        ? `${product} (${variant}) is out of stock.`
        : `${product} is out of stock.`,
      code: 'OUT_OF_STOCK',
    };
  }
  const unavail = msg.match(/UNAVAILABLE:([^:]+):(.*)/);
  if (unavail) {
    return {
      ok: false,
      error: `${unavail[1]} is no longer available. Remove it to continue.`,
      code: 'UNAVAILABLE',
    };
  }
  if (msg.includes('EMPTY_CART')) {
    return { ok: false, error: 'Your cart is empty.', code: 'EMPTY_CART' };
  }
  return { ok: false, error: msg, code: 'UNKNOWN' };
}
