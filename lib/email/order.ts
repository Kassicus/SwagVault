import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { formatAmount } from '@/lib/currency/format';
import { variantDisplayName } from '@/lib/products/types';
import { resend, FROM_EMAIL } from '@/lib/email/resend';
import {
  orderPlacedMember,
  orderPlacedAdmin,
} from '@/lib/email/templates/order-placed';

// Best-effort: if Resend isn't configured or anything fails, log and return.
// Never throw — order placement should never depend on email delivery.
export async function sendOrderEmails(args: {
  slug: string;
  orderId: string;
  organizationId: string;
  organizationName: string;
  userId: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log('Resend not configured; skipping order emails');
    return;
  }
  try {
    const service = createSupabaseServiceClient();

    // Order + items
    const { data: order } = await service
      .from('orders')
      .select(
        'id, fulfillment_method, total_minor_units, order_items(product_name, variant_name, qty, unit_price_minor_units)',
      )
      .eq('id', args.orderId)
      .single();
    if (!order) return;

    // Currency
    const { data: currency } = await service
      .from('organization_currencies')
      .select('name, symbol, decimal_places')
      .eq('organization_id', args.organizationId)
      .single();
    if (!currency) return;

    // Buyer email
    const { data: buyer } = await service.auth.admin.getUserById(args.userId);
    const buyerEmail = buyer?.user?.email ?? '';

    const orderItems = (
      (order as unknown as {
        order_items: Array<{
          product_name: string;
          variant_name: string | null;
          qty: number;
          unit_price_minor_units: number;
        }>;
      }).order_items
    ).map((oi) => {
      const variantDisplay = variantDisplayName({
        name: oi.variant_name ?? '',
        options: null,
      });
      const label =
        variantDisplay && variantDisplay !== 'default' && variantDisplay !== ''
          ? `${oi.product_name} — ${variantDisplay}`
          : oi.product_name;
      return {
        name: label,
        qty: oi.qty,
        subtotalText: formatAmount(
          oi.unit_price_minor_units * oi.qty,
          currency,
        ),
      };
    });

    const totalText = formatAmount(order.total_minor_units, currency);
    const fulfillment =
      order.fulfillment_method === 'shipping' ? 'shipping' : 'pickup';

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const memberUrl = `${appUrl}/${args.slug}/orders/${args.orderId}`;
    const adminUrl = `${appUrl}/${args.slug}/admin/orders/${args.orderId}`;

    // Member confirmation
    if (buyerEmail) {
      const tmpl = orderPlacedMember({
        orgName: args.organizationName,
        totalText,
        items: orderItems,
        fulfillment,
        orderUrl: memberUrl,
      });
      await resend().emails.send({
        from: FROM_EMAIL,
        to: buyerEmail,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    }

    // Admin notifications
    const { data: admins } = await service
      .from('memberships')
      .select('user_id')
      .eq('organization_id', args.organizationId)
      .in('role', ['owner', 'admin']);

    const adminUserIds = (admins ?? []).map((m) => m.user_id);
    const adminEmails: string[] = [];
    for (const uid of adminUserIds) {
      const { data } = await service.auth.admin.getUserById(uid);
      if (data?.user?.email && data.user.email !== buyerEmail) {
        adminEmails.push(data.user.email);
      }
    }

    if (adminEmails.length > 0) {
      const tmpl = orderPlacedAdmin({
        orgName: args.organizationName,
        buyerEmail: buyerEmail || 'unknown',
        totalText,
        items: orderItems,
        fulfillment,
        orderUrl: adminUrl,
      });
      await resend().emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
      });
    }
  } catch (err) {
    console.error('sendOrderEmails:', err);
  }
}
