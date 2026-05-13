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

## Manual setup (do these before Phase 1)

These can't be done from code — run them once and capture the keys in `.env.local`.

1. **Install the Vercel CLI** so we can use `vercel link` and `vercel env pull`:
   ```bash
   npm i -g vercel
   ```
2. **Create the Supabase project** via the Vercel Marketplace integration (Vercel dashboard → Storage → Marketplace → Supabase). This auto-injects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the linked Vercel project.
3. **Create the Stripe product + two prices** in the Stripe dashboard:
   - Product: "SwagVault Pro"
   - Recurring price #1: $25 USD / month → record id as `STRIPE_PRICE_MONTHLY`
   - Recurring price #2: $220 USD / year → record id as `STRIPE_PRICE_ANNUAL`
   - Add `STRIPE_SECRET_KEY` (test mode for now) and `STRIPE_WEBHOOK_SECRET` (from `stripe listen --forward-to localhost:3000/api/webhooks/stripe`).
4. **Create a Resend API key** and add it as `RESEND_API_KEY`. Set `RESEND_FROM_EMAIL` to a verified sender.
5. `vercel link` this directory to the Vercel project, then `vercel env pull .env.local` to sync.

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
