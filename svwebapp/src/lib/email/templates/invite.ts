export function inviteEmailHtml({
  orgName,
  inviterName,
  inviteUrl,
}: {
  orgName: string;
  inviterName: string;
  inviteUrl: string;
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
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">You've been invited!</p>

    <p style="color: #0a0e1a; font-size: 16px; line-height: 1.6;">
      <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on SwagVault.
    </p>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${inviteUrl}" style="display: inline-block; background-color: #c9a84c; color: #0a0e1a; text-decoration: none; font-weight: 600; padding: 12px 32px; border-radius: 8px; font-size: 14px;">
        Accept Invitation
      </a>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`.trim();
}
