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
