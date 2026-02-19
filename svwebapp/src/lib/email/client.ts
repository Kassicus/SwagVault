import { Resend } from "resend";
import { config } from "../config";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(config.email.apiKey());
  }
  return resendClient;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const { error } = await resend.emails.send({
    from: config.email.from(),
    to,
    subject,
    html,
  });

  if (error) throw new Error(`Email failed: ${error.message}`);
}
