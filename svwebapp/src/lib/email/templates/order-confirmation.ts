export function orderConfirmationHtml({
  orgName,
  orderNumber,
  totalCost,
  currencySymbol,
  itemCount,
}: {
  orgName: string;
  orderNumber: number;
  totalCost: number;
  currencySymbol: string;
  itemCount: number;
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
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Order Confirmation</p>

    <p style="color: #0a0e1a; font-size: 16px; line-height: 1.6;">
      Your order <strong>#${orderNumber}</strong> from <strong>${orgName}</strong> has been placed.
    </p>

    <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px;">
      <p style="margin: 0; color: #64748b; font-size: 13px;">Items: ${itemCount}</p>
      <p style="margin: 8px 0 0; color: #0a0e1a; font-size: 20px; font-weight: 600;">${currencySymbol}${totalCost.toLocaleString()}</p>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
      You'll receive an update when your order status changes.
    </p>
  </div>
</body>
</html>`.trim();
}
