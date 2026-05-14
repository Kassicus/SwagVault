// Sent when an admin invites someone who already has a SwagVault account
// (e.g. they're in another org). No password to set — just sign in.

const C = {
  bg: '#0e0e0c',
  card: '#1a1a17',
  fg: '#f4f4f0',
  muted: '#a8a89e',
  primary: '#ffe066',
  primaryFg: '#0e0e0c',
  mint: '#00ffa3',
};

const FONT_SANS =
  "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace";

export function addedToOrgEmail(args: {
  orgName: string;
  signInUrl: string;
}): { subject: string; html: string; text: string } {
  const { orgName, signInUrl } = args;
  const subject = `You've been added to ${orgName} on SwagVault`;

  const text = [
    "// You've been added",
    `JOIN ${orgName.toUpperCase()}`,
    '',
    `You already have a SwagVault account, so we've gone ahead and added you to ${orgName}.`,
    '',
    `Sign in: ${signInUrl}`,
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark only" />
<meta name="supported-color-schemes" content="dark only" />
<title>Added to ${escape(orgName)}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};font-family:${FONT_SANS};color:${C.fg};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:100%;">
        <tr>
          <td style="padding:0 0 24px 0;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.fg};font-weight:700;">
            SwagVault
          </td>
        </tr>

        <tr>
          <td style="background:${C.card};border:2px solid ${C.fg};padding:28px;">
            <div style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${C.mint};font-weight:700;">
              // You&rsquo;ve been added
            </div>
            <h1 style="margin:12px 0 0 0;font-size:32px;line-height:1.05;letter-spacing:-0.02em;text-transform:uppercase;color:${C.fg};font-weight:900;">
              Welcome to ${escape(orgName)}
            </h1>
            <p style="margin:14px 0 0 0;font-size:15px;line-height:1.55;color:${C.muted};">
              You already have a SwagVault account, so we&rsquo;ve added you to
              <strong>${escape(orgName)}</strong>. Sign in and you&rsquo;ll land
              in their storefront.
            </p>
          </td>
        </tr>

        <tr><td style="height:24px;line-height:24px;font-size:24px;">&nbsp;</td></tr>
        <tr>
          <td align="center">
            <a href="${escape(signInUrl)}" style="display:inline-block;background:${C.primary};color:${C.primaryFg};border:2px solid ${C.fg};padding:14px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:0.04em;text-decoration:none;">
              Sign in →
            </a>
          </td>
        </tr>

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

  return { subject, html, text };
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
