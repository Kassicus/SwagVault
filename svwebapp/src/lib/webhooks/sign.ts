import crypto from "node:crypto";

export function signPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signedContent = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac("sha256", secret).update(signedContent).digest("hex");
  return `sha256=${hmac}`;
}

export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("hex")}`;
}
