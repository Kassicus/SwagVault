import { Resend } from 'resend';

let _client: Resend | null = null;
export function resend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  _client = new Resend(key);
  return _client;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'SwagVault <onboarding@resend.dev>';

// Reply-To defaults to the From address unless overridden. Setting an explicit
// Reply-To improves classification with strict spam filters.
export const REPLY_TO =
  process.env.RESEND_REPLY_TO ?? FROM_EMAIL;

// Required transactional headers for good mailbox-provider classification.
// Gmail's 2024 sender requirements expect a List-Unsubscribe header even on
// transactional mail. For now we point it at a mailto so admins can be
// notified out-of-band — wire it to a real unsubscribe page later.
export function transactionalHeaders(): Record<string, string> {
  const fromEmail =
    extractEmail(REPLY_TO) ?? extractEmail(FROM_EMAIL) ?? 'support@example.com';
  return {
    'List-Unsubscribe': `<mailto:${fromEmail}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

function extractEmail(value: string): string | null {
  // Handles "Name <addr@example.com>" or a bare "addr@example.com".
  const m = value.match(/<([^>]+)>/);
  if (m) return m[1];
  if (value.includes('@')) return value.trim();
  return null;
}
