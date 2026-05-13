// Single source of truth for whether Stripe is wired up.
// Defaults to false so the app works end-to-end before billing is configured.
// Flip BILLING_ENABLED=true once Stripe products + webhook are live.
export function isBillingEnabled(): boolean {
  return process.env.BILLING_ENABLED === 'true';
}
