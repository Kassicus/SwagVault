type Item = { name: string; qty: number; subtotalText: string };

export function orderPlacedMember(args: {
  orgName: string;
  totalText: string;
  items: Item[];
  fulfillment: 'shipping' | 'pickup';
  orderUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Order received — ${args.orgName}`;
  const lines = args.items
    .map((i) => `  • ${i.name} × ${i.qty} — ${i.subtotalText}`)
    .join('\n');
  const text = [
    `We received your order from ${args.orgName}.`,
    '',
    'Items:',
    lines,
    '',
    `Total: ${args.totalText}`,
    `Fulfillment: ${args.fulfillment === 'shipping' ? 'Ship to me' : 'Pickup'}`,
    '',
    `View it here: ${args.orderUrl}`,
  ].join('\n');
  const itemsHtml = args.items
    .map(
      (i) =>
        `<li style="margin: 4px 0;">${escape(i.name)} × ${i.qty} — ${escape(i.subtotalText)}</li>`,
    )
    .join('');
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="font-size: 20px; margin: 0 0 16px;">Order received</h2>
  <p>Thanks — we received your order from <strong>${escape(args.orgName)}</strong>.</p>
  <ul style="padding-left: 16px;">${itemsHtml}</ul>
  <p style="margin: 20px 0 8px;"><strong>Total:</strong> ${escape(args.totalText)}</p>
  <p style="margin: 0 0 20px;"><strong>Fulfillment:</strong> ${args.fulfillment === 'shipping' ? 'Ship to me' : 'Pickup'}</p>
  <p>
    <a href="${escape(args.orderUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">View order</a>
  </p>
</body></html>`;
  return { subject, html, text };
}

export function orderPlacedAdmin(args: {
  orgName: string;
  buyerEmail: string;
  totalText: string;
  items: Item[];
  fulfillment: 'shipping' | 'pickup';
  orderUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `New order — ${args.buyerEmail} (${args.orgName})`;
  const lines = args.items
    .map((i) => `  • ${i.name} × ${i.qty} — ${i.subtotalText}`)
    .join('\n');
  const text = [
    `${args.buyerEmail} just placed an order in ${args.orgName}.`,
    '',
    'Items:',
    lines,
    '',
    `Total: ${args.totalText}`,
    `Fulfillment: ${args.fulfillment === 'shipping' ? 'Ship' : 'Pickup'}`,
    '',
    `Manage it here: ${args.orderUrl}`,
  ].join('\n');
  const itemsHtml = args.items
    .map(
      (i) =>
        `<li style="margin: 4px 0;">${escape(i.name)} × ${i.qty} — ${escape(i.subtotalText)}</li>`,
    )
    .join('');
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
  <h2 style="font-size: 20px; margin: 0 0 16px;">New order</h2>
  <p><strong>${escape(args.buyerEmail)}</strong> placed an order in ${escape(args.orgName)}.</p>
  <ul style="padding-left: 16px;">${itemsHtml}</ul>
  <p style="margin: 20px 0 8px;"><strong>Total:</strong> ${escape(args.totalText)}</p>
  <p style="margin: 0 0 20px;"><strong>Fulfillment:</strong> ${args.fulfillment === 'shipping' ? 'Ship' : 'Pickup'}</p>
  <p>
    <a href="${escape(args.orderUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 10px 16px; border-radius: 8px; text-decoration: none;">View in admin</a>
  </p>
</body></html>`;
  return { subject, html, text };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
