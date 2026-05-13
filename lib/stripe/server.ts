import Stripe from 'stripe';

let _client: Stripe | null = null;
export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _client = new Stripe(key);
  return _client;
}

export const PRICE_IDS = {
  monthly: () => requiredEnv('STRIPE_PRICE_MONTHLY'),
  annual: () => requiredEnv('STRIPE_PRICE_ANNUAL'),
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}
