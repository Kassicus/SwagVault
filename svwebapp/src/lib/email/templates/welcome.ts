export function welcomeEmailHtml({
  displayName,
  orgName,
  loginUrl,
}: {
  displayName: string;
  orgName: string;
  loginUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'DM Sans', Arial, sans-serif; margin: 0; padding: 40px 20px; background-color: #f8fafc;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; border: 1px solid #e2e8f0;">
    <h1 style="color: #0a0e1a; font-size: 24px; margin: 0 0 8px;">
      <span style="color: #c9a84c;">Swag</span>Vault
    </h1>
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Welcome aboard!</p>

    <p style="color: #0a0e1a; font-size: 16px; line-height: 1.6;">
      Hi <strong>${displayName}</strong>, welcome to <strong>${orgName}</strong> on SwagVault!
    </p>

    <p style="color: #0a0e1a; font-size: 14px; line-height: 1.6; margin-top: 16px;">
      Your organization is set up and ready to go. Start by configuring your currency, adding catalog items, and inviting your team.
    </p>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #c9a84c; color: #0a0e1a; text-decoration: none; font-weight: 600; padding: 12px 32px; border-radius: 8px; font-size: 14px;">
        Go to Dashboard
      </a>
    </div>
  </div>
</body>
</html>`.trim();
}
