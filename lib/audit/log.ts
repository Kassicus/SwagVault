import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/supabase/types';

// Conventional action values. Adding a new one is a code-only change — the
// SQL column is plain text. The audit-log UI categorises rows by prefix:
//   invite_*  / member_*   → People
//   product_*              → Products
//   order_*                → Orders
//   currency_/settings_/subscription_ → Settings
export type AuditAction =
  | 'invite_sent'
  | 'invite_resent'
  | 'invite_revoked'
  | 'invite_accepted'
  | 'member_added'
  | 'member_role_changed'
  | 'member_removed'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'order_fulfilled'
  | 'order_cancelled'
  | 'currency_updated'
  | 'settings_updated'
  | 'subscription_changed';

// Best-effort write. Audit logging must never break the action that triggers
// it, so this swallows all errors after console.error.
export async function logAudit(args: {
  organizationId: string;
  actorUserId?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    const { error } = await service.from('audit_logs').insert({
      organization_id: args.organizationId,
      actor_user_id: args.actorUserId ?? null,
      action: args.action,
      target_type: args.targetType ?? null,
      target_id: args.targetId ?? null,
      metadata: (args.metadata ?? null) as Json | null,
    });
    if (error) console.error('logAudit:', error.message);
  } catch (err) {
    console.error('logAudit:', err);
  }
}

// Category helper used by the audit-log page filters.
export function categoryOf(action: string): 'people' | 'products' | 'orders' | 'settings' | 'other' {
  if (action.startsWith('invite_') || action.startsWith('member_')) return 'people';
  if (action.startsWith('product_')) return 'products';
  if (action.startsWith('order_')) return 'orders';
  if (
    action.startsWith('currency_') ||
    action.startsWith('settings_') ||
    action.startsWith('subscription_')
  ) {
    return 'settings';
  }
  return 'other';
}
