# SwagVault

A SaaS for businesses that reward employees with an internal currency redeemable in a private merch storefront.

## Stack

- **Next.js 16** (App Router, TS) on **Vercel** (Fluid Compute)
- **Supabase** Postgres + Auth + Storage (RLS as the multi-tenant guardrail)
- **Stripe** for SwagVault subscription billing ($25/mo or $220/yr)
- **Resend** for transactional email
- **Tailwind CSS v4** + **shadcn/ui**

See `.context/attachments/plan.md` for the full project plan and phased build order.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

App boots at http://localhost:3000.

## Scripts

- `npm run dev` — start dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`

## Manual setup

These can't be done from code — run them once and capture the keys in `.env.local`.

1. **Install the Vercel CLI** so we can use `vercel link` and `vercel env pull`:
   ```bash
   npm i -g vercel
   ```
2. **Create the Supabase project** via the Vercel Marketplace integration (Vercel dashboard → Storage → Marketplace → Supabase). This auto-injects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the linked Vercel project.
3. **Apply migrations.** In the Supabase dashboard SQL editor, paste `supabase/migrations/0001_init.sql` and run it. Or use the Supabase CLI: `supabase link --project-ref <ref> && supabase db push`. Then **disable email confirmation** (Auth → Settings → "Enable email confirmations" → off) for the smoothest dev onboarding.
4. **Create the Stripe product + two prices** in the Stripe dashboard:
   - Product: "SwagVault Pro"
   - Recurring price #1: $25 USD / month → record id as `STRIPE_PRICE_MONTHLY`
   - Recurring price #2: $220 USD / year → record id as `STRIPE_PRICE_ANNUAL`
   - Add `STRIPE_SECRET_KEY` (test mode for now). For webhooks, run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the printed signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Create a Resend API key** and add it as `RESEND_API_KEY`. Set `RESEND_FROM_EMAIL` to a verified sender (e.g. `SwagVault <invites@yourdomain.com>` or `onboarding@resend.dev` for dev).
6. **Create a Vercel Blob store** in the Vercel dashboard (Storage → Create → Blob). This auto-injects `BLOB_READ_WRITE_TOKEN` to all environments. Used for currency icons and (later) product images.
7. `vercel link` this directory to the Vercel project, then `vercel env pull .env.local` to sync.

## Phase 1 verification

After provisioning above:

- Sign up at `/signup` → org name → pick slug → pick plan → land in Stripe Checkout. Use test card `4242 4242 4242 4242`. On success you land in `/<slug>/admin` with `subscription_status` still `incomplete`.
- With `stripe listen` running, the webhook flips `subscription_status` to `active`.
- Sign up a second org in another browser. Try visiting Org A's slug from Org B's session → 404.
- Cancel the subscription via the admin Billing page → portal → cancel. Webhook moves status to `canceled`. Storefront paths redirect to `/<slug>/subscription-required`.
- Invite a teammate at `/<slug>/admin/members`. They receive a Resend email with a link to `/accept-invite/<token>`; clicking it walks them through sign-in/sign-up and creates their membership.

## Project layout

```
app/                    Next.js routes (App Router)
components/ui/          shadcn primitives
lib/
  supabase/             browser + server + service clients (typed)
  auth/                 getSession, requireOrg, requireAdmin
  email/                Resend wrapper + React Email templates
  stripe/               Stripe SDK helper + price IDs
  currency/             Money formatter + <Money/> component
vercel.ts               typed Vercel project config
```
