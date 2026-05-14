'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/session';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit/log';

export type AdminOrderActionResult = { error: string | null };

export async function fulfillOrderAction(
  _prev: AdminOrderActionResult,
  formData: FormData,
): Promise<AdminOrderActionResult> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const orderId = String(formData.get('order_id') ?? '');
  if (!orderId) return { error: 'Missing order id.' };

  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();

  const { data: order, error: fErr } = await service
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (fErr) return { error: fErr.message };
  if (!order) return { error: 'Order not found.' };
  if (order.status === 'cancelled') {
    return { error: 'Cancelled orders cannot be fulfilled.' };
  }
  if (order.status === 'fulfilled') {
    return { error: 'Order is already fulfilled.' };
  }

  const { error } = await service
    .from('orders')
    .update({ status: 'fulfilled' })
    .eq('id', orderId)
    .eq('organization_id', ctx.organizationId);
  if (error) return { error: error.message };

  await logAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: 'order_fulfilled',
    targetType: 'order',
    targetId: orderId,
  });

  revalidatePath(`/${slug}/admin/orders`);
  revalidatePath(`/${slug}/admin/orders/${orderId}`);
  revalidatePath(`/${slug}/orders/${orderId}`);
  return { error: null };
}

export async function cancelOrderAction(
  _prev: AdminOrderActionResult,
  formData: FormData,
): Promise<AdminOrderActionResult> {
  const slug = String(formData.get('slug') ?? '').toLowerCase();
  const orderId = String(formData.get('order_id') ?? '');
  if (!orderId) return { error: 'Missing order id.' };

  const ctx = await requireAdmin(slug);
  const service = createSupabaseServiceClient();

  // Sanity-check the order belongs to this org before invoking the RPC
  // (the RPC itself doesn't check org membership — it's service-role-only).
  const { data: order, error: fErr } = await service
    .from('orders')
    .select('id, organization_id')
    .eq('id', orderId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle();
  if (fErr) return { error: fErr.message };
  if (!order) return { error: 'Order not found.' };

  const { error } = await service.rpc('cancel_order', {
    p_order_id: orderId,
    p_actor_user_id: ctx.userId,
  });
  if (error) {
    if (error.message.includes('ALREADY_CANCELLED')) {
      return { error: 'Order is already cancelled.' };
    }
    return { error: error.message };
  }

  await logAudit({
    organizationId: ctx.organizationId,
    actorUserId: ctx.userId,
    action: 'order_cancelled',
    targetType: 'order',
    targetId: orderId,
  });

  revalidatePath(`/${slug}/admin/orders`);
  revalidatePath(`/${slug}/admin/orders/${orderId}`);
  revalidatePath(`/${slug}/orders/${orderId}`);
  revalidatePath(`/${slug}/account`);
  revalidatePath(`/${slug}/admin/members`);
  return { error: null };
}
