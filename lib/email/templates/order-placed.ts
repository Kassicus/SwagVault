// Neo-brutalist order emails. Dark-default to match the in-app theme:
// solid colors, bold black-on-yellow heading panels, mono small-caps labels,
// 2px borders, no gradients/shadows so it renders consistently across
// Gmail / Apple Mail / Outlook.

type Item = {
  name: string;
  qty: number;
  subtotalText: string;
  imageUrl?: string | null;
};

const C = {
  bg: '#0e0e0c',
  card: '#1a1a17',
  fg: '#f4f4f0',
  muted: '#a8a89e',
  primary: '#ffe066',
  primaryFg: '#0e0e0c',
  mint: '#00ffa3',
  secondary: '#ff5e3a',
};

const FONT_SANS =
  "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

export function orderPlacedMember(args: {
  orgName: string;
  totalText: string;
  items: Item[];
  fulfillment: 'shipping' | 'pickup';
  orderUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Order received — ${args.orgName}`;
  return {
    subject,
    text: plainText({
      eyebrow: '// Order received',
      heading: 'THANKS — WE GOT IT.',
      lead: `Your order from ${args.orgName} is in. Here's what's on the way.`,
      ...args,
      ctaLabel: 'View order →',
    }),
    html: brutalistEmail({
      eyebrow: '// Order received',
      heading: 'Thanks — we got it.',
      lead: `Your order from <strong>${escape(args.orgName)}</strong> is in. Here&rsquo;s what&rsquo;s on the way.`,
      items: args.items,
      totalText: args.totalText,
      fulfillment: args.fulfillment,
      ctaUrl: args.orderUrl,
      ctaLabel: 'View order →',
      accent: C.mint,
    }),
  };
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
  return {
    subject,
    text: plainText({
      eyebrow: '// New order',
      heading: `${args.buyerEmail.toUpperCase()} JUST BOUGHT SWAG.`,
      lead: `Heads up: ${args.buyerEmail} placed an order in ${args.orgName}.`,
      items: args.items,
      totalText: args.totalText,
      fulfillment: args.fulfillment,
      ctaLabel: 'Manage in admin →',
    }),
    html: brutalistEmail({
      eyebrow: '// New order',
      heading: 'Someone just bought swag.',
      lead: `<strong>${escape(args.buyerEmail)}</strong> placed an order in <strong>${escape(args.orgName)}</strong>.`,
      items: args.items,
      totalText: args.totalText,
      fulfillment: args.fulfillment,
      ctaUrl: args.orderUrl,
      ctaLabel: 'Manage in admin →',
      accent: C.secondary,
    }),
  };
}

// ---------------------------------------------------------------------------

type EmailArgs = {
  eyebrow: string;
  heading: string;
  lead: string;
  items: Item[];
  totalText: string;
  fulfillment: 'shipping' | 'pickup';
  ctaUrl: string;
  ctaLabel: string;
  accent: string;
};

function brutalistEmail(a: EmailArgs): string {
  const itemRows = a.items.map((it) => itemRow(it)).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>${escape(a.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT_SANS};color:${C.fg};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">
        <!-- Logo bar -->
        <tr>
          <td style="padding:0 0 24px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.fg};font-weight:700;">
            SwagVault
          </td>
        </tr>

        <!-- Header card -->
        <tr>
          <td style="background:${C.card};border:2px solid ${C.fg};padding:28px 28px 24px 28px;">
            <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${a.accent};font-weight:700;">
              ${escape(a.eyebrow)}
            </div>
            <h1 style="margin:12px 0 0 0;font-size:32px;line-height:1.05;letter-spacing:-0.02em;text-transform:uppercase;color:${C.fg};font-weight:900;">
              ${escape(a.heading)}
            </h1>
            <p style="margin:14px 0 0 0;font-size:14px;line-height:1.55;color:${C.muted};">
              ${a.lead}
            </p>
          </td>
        </tr>

        <!-- Items card -->
        <tr><td style="height:14px;line-height:14px;font-size:14px;">&nbsp;</td></tr>
        <tr>
          <td style="background:${C.card};border:2px solid ${C.fg};padding:20px 24px;">
            <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};font-weight:700;padding-bottom:10px;border-bottom:2px solid ${C.fg};">
              Items
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
              ${itemRows}
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-top:2px solid ${C.fg};">
              <tr>
                <td style="padding:14px 0 0 0;font-family:${FONT_SANS};font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:${C.muted};font-weight:700;">
                  Total
                </td>
                <td align="right" style="padding:14px 0 0 0;font-family:${FONT_SANS};font-size:22px;font-weight:900;color:${C.fg};">
                  ${escape(a.totalText)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Fulfillment + CTA -->
        <tr><td style="height:14px;line-height:14px;font-size:14px;">&nbsp;</td></tr>
        <tr>
          <td style="background:${C.card};border:2px solid ${C.fg};padding:20px 24px;">
            <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};font-weight:700;">
              Fulfillment
            </div>
            <div style="margin-top:6px;font-size:15px;font-weight:700;color:${C.fg};">
              ${a.fulfillment === 'shipping' ? 'Shipping' : 'Pickup'}
            </div>
          </td>
        </tr>

        <tr><td style="height:24px;line-height:24px;font-size:24px;">&nbsp;</td></tr>
        <tr>
          <td align="center">
            <a href="${escape(a.ctaUrl)}" style="display:inline-block;background:${C.primary};color:${C.primaryFg};border:2px solid ${C.fg};padding:14px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;text-decoration:none;">
              ${escape(a.ctaLabel)}
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr><td style="height:32px;line-height:32px;font-size:32px;">&nbsp;</td></tr>
        <tr>
          <td style="border-top:2px solid ${C.fg};padding-top:14px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">
            SwagVault · Internal currency for company merch
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function itemRow(it: Item): string {
  const variantBits = '';
  const img = it.imageUrl
    ? `<img src="${escape(it.imageUrl)}" alt="" width="64" height="64" style="display:block;width:64px;height:64px;border:2px solid ${C.fg};object-fit:cover;background:${C.bg};" />`
    : `<div style="width:64px;height:64px;border:2px solid ${C.fg};background:${C.bg};"></div>`;
  return `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${C.muted};vertical-align:top;width:64px;">
    ${img}
  </td>
  <td style="padding:12px 0 12px 14px;border-bottom:1px solid ${C.muted};vertical-align:top;">
    <div style="font-size:15px;font-weight:700;color:${C.fg};line-height:1.3;">${escape(it.name)}</div>
    ${variantBits}
    <div style="margin-top:2px;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};">× ${it.qty}</div>
  </td>
  <td align="right" style="padding:12px 0;border-bottom:1px solid ${C.muted};vertical-align:top;font-family:${FONT_SANS};font-size:15px;font-weight:900;color:${C.fg};white-space:nowrap;">
    ${escape(it.subtotalText)}
  </td>
</tr>`;
}

function plainText(a: {
  eyebrow: string;
  heading: string;
  lead: string;
  items: Item[];
  totalText: string;
  fulfillment: 'shipping' | 'pickup';
  ctaLabel: string;
  ctaUrl?: string;
}): string {
  const lines = [
    a.eyebrow,
    a.heading,
    '',
    a.lead.replace(/<[^>]+>/g, ''),
    '',
    'ITEMS',
    ...a.items.map((i) => `  • ${i.name} × ${i.qty} — ${i.subtotalText}`),
    '',
    `TOTAL: ${a.totalText}`,
    `FULFILLMENT: ${a.fulfillment === 'shipping' ? 'Shipping' : 'Pickup'}`,
    '',
  ];
  if (a.ctaUrl) lines.push(`${a.ctaLabel} ${a.ctaUrl}`);
  return lines.join('\n');
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
