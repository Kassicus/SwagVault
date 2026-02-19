# SwagVault

Branded currency stores for organizations. Each org gets its own vault currency, item catalog, and order management system.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4, class-based dark mode via `next-themes`
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Auth.js v5 (Credentials + Microsoft Entra ID SSO)
- **Payments:** Stripe (subscriptions, checkout, billing portal)
- **Storage:** Supabase (file uploads, signed URLs)
- **Email:** Resend (transactional emails)
- **Compiler:** React Compiler enabled

## Features

### Core
- Multi-tenant architecture (single DB, shared schema, RLS via `withTenant()`)
- Custom branded currency per organization
- Item catalog with categories, images, markdown descriptions
- Shopping cart and order management
- Transaction ledger with full audit trail

### Admin
- Dashboard with stats and activity feed
- Catalog management (CRUD, stock tracking, active toggle)
- Order management (approve, fulfill, cancel with auto-refund)
- User management (invite, roles, activate/deactivate)
- Currency distribution and ledger
- Billing page (plan usage, Stripe checkout, billing portal)
- SSO configuration (Microsoft Entra ID)
- Organization settings

### Billing
- Stripe subscription management (Pro and Enterprise tiers)
- Plan enforcement (member and item limits)
- Trial period support (14 days)
- Webhook-driven lifecycle (checkout, subscription updates, payment failures)
- Customer billing portal

### User Experience
- Dark/light mode toggle (persisted)
- Skeleton loading states for all routes
- Error boundaries per route group
- URL-based pagination and sorting on all data tables
- Catalog search and category filtering
- Image gallery with thumbnails
- Markdown rendering for item descriptions
- CSV export for ledger and users
- Transactional emails (order confirmation, status updates, welcome)
- Profile editing

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database (Supabase recommended)
- Stripe account
- Resend account

### Setup

1. Clone and install:
   ```bash
   cd svwebapp
   pnpm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

3. Fill in all environment variables in `.env.local`

4. Push database schema:
   ```bash
   pnpm db:push
   ```

5. Start dev server:
   ```bash
   pnpm dev
   ```

6. Visit `http://localhost:3000/signup` to create your first organization

### Stripe Setup

1. Create products and prices in your Stripe dashboard
2. Set `STRIPE_PRO_PRICE_ID` and `STRIPE_ENTERPRISE_PRICE_ID` in `.env.local`
3. For local development, forward webhooks:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Microsoft SSO Setup (Optional)

1. Register an app in Microsoft Entra ID (Azure AD)
2. Set redirect URI to `{NEXTAUTH_URL}/api/auth/callback/microsoft-entra-id`
3. Add `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` to `.env.local`
4. In admin settings, configure the Microsoft Tenant ID for your org

## Project Structure

```
src/
  app/
    (auth)/         # Login, register pages
    (marketing)/    # Signup wizard, landing page
    (store)/        # Cart, orders, profile, item detail
    admin/          # Dashboard, catalog, orders, users, currency, billing, settings
    api/            # Auth, Stripe webhooks/checkout/portal, CSV export
  components/
    admin/          # Sidebar, stat card, toggle components
    marketing/      # Landing page components
    shared/         # Logo, theme toggle
    store/          # Catalog, item card, cart, image gallery, search
    ui/             # Button, input, card, badge, data table, pagination, skeleton, etc.
  lib/
    auth/           # Auth config, SSO, session, password utilities
    currency/       # Currency engine (credit, debit)
    db/             # Drizzle client, schema, tenant helper, pagination
    email/          # Resend client, email templates
    stripe/         # Stripe client, plan definitions, enforcement
    storage/        # Supabase storage helpers
    tenant/         # Tenant resolution (subdomain, query param)
    validators/     # Zod schemas
```

## Plan Tiers

| Feature | Pro | Enterprise |
|---------|-----|-----------|
| Members | 25 | Unlimited |
| Catalog Items | 100 | Unlimited |
| SSO | - | Yes |
| API Access | - | Yes |

## Environment Variables

See [`.env.local.example`](.env.local.example) for all required variables.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |
