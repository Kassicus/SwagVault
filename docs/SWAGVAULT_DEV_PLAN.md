# SwagVault — Development Plan (Hosted SaaS)

## Project Overview

**SwagVault** is a hosted eStore platform that allows businesses and schools to create branded digital currency stores where members earn and spend tokens on company/organization swag. Each organization gets their own SwagVault instance at `{slug}.getswagvault.com`.

This plan focuses exclusively on the **hosted SaaS product**. Self-hosted/Docker packaging is a future initiative — we get the core product right first.

**Business model:** Paid subscription SaaS. The free option will be the future self-hosted Docker package — the hosted product is a premium, managed experience from day one.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Turbopack default, Cache Components, proxy.ts. Best-in-class Vercel integration. |
| **Language** | TypeScript (strict mode) | Type safety across the full stack. |
| **Hosting** | Vercel | Zero-config Next.js 16 deploys, edge network, preview deployments per PR. |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with Row Level Security for multi-tenant isolation. Connection pooling via Supavisor for serverless. |
| **ORM** | Drizzle ORM | Type-safe, SQL-first. Works cleanly with Supabase's Postgres. |
| **Auth** | NextAuth.js (Auth.js v5) | Credentials provider now, Microsoft Entra ID SSO later. Keeps auth under our control vs. Supabase Auth. |
| **File Storage** | Supabase Storage | S3-compatible object storage for item images and org logos. Built into the same platform as the DB. |
| **Email** | Resend | Modern transactional email API. Great DX, generous free tier. |
| **Styling** | Tailwind CSS 4 | Utility-first, matches the brand system. |
| **Payments** | Stripe | Subscription billing for paid plans. Not needed for MVP — add in Phase 2. |
| **Package Manager** | pnpm | Fast, strict dependency resolution. |

---

## Multi-Tenant Architecture

SwagVault uses a **single database, shared schema** multi-tenant model. Every data row belongs to an organization via a `tenant_id` foreign key. Supabase Row Level Security (RLS) enforces tenant isolation at the database level — even if application code has a bug, one tenant can never access another tenant's data.

### How It Works

1. **Every table** (except `organizations` and global `users`) has a `tenant_id` column referencing `organizations.id`.
2. **RLS policies** on every table enforce `WHERE tenant_id = current_tenant()` on all SELECT, INSERT, UPDATE, DELETE operations.
3. The `current_tenant()` function reads from a Postgres session variable (`app.current_tenant`) set by the application at the start of each request.
4. **On every API request**, the application:
   - Resolves the tenant from the authenticated user's session (user → organization mapping)
   - Sets `SET LOCAL app.current_tenant = '{tenant_id}'` on the database connection
   - All subsequent queries in that request are automatically scoped to the tenant

### Subdomain Routing

Each organization gets a subdomain: `{slug}.getswagvault.com`

- `proxy.ts` extracts the subdomain from the request hostname
- Resolves the `organization` record by slug
- Sets the tenant context for the request
- Redirects to login if unauthenticated
- The marketing site lives at `getswagvault.com` (no subdomain)

### Tenant Resolution Flow

```
Request → proxy.ts
  ├── getswagvault.com (no subdomain) → marketing site
  ├── {slug}.getswagvault.com → resolve org by slug
  │   ├── Org found → set tenant context → continue to app
  │   └── Org not found → 404 page
  └── app.getswagvault.com → dashboard / org creation
```

### Vercel Configuration

- Wildcard domain: `*.getswagvault.com` pointed to Vercel
- `vercel.json` or project settings configured for wildcard subdomain handling
- Preview deployments use a separate pattern to avoid conflicts

---

## Next.js 16 Conventions

### Turbopack (Default)
- No `--turbopack` flags needed. Do not add custom webpack config.
- File system caching stable in 16.1 for faster dev restarts.

### Async Params & SearchParams
- All route params and searchParams are async — always `await` before use.
```tsx
// ✅ Correct
export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
}
```

### Proxy (Replaces Middleware)
- `proxy.ts` handles subdomain extraction, tenant resolution, and auth redirects.
- Runs on Node.js runtime only.

### Cache Components
- Caching is opt-in via `"use cache"` directive.
- Use `cacheLife()` and `cacheTag()` (stable, no prefix) for explicit control.
- Cache candidates: public catalog pages, category listings, org branding/settings.
- Never cache: user-specific pages (balance, orders, cart).
- **Critical:** Include `tenant_id` in all cache tags to prevent cross-tenant cache leaks (e.g., `cacheTag(\`catalog-${tenantId}\`)`).

### Node.js Requirement
- Minimum: **20.9.0**

---

## Project Structure

```
swagvault/
├── src/
│   ├── app/
│   │   ├── (marketing)/                # Marketing site (getswagvault.com)
│   │   │   ├── layout.tsx              # Marketing layout
│   │   │   ├── page.tsx                # Landing page
│   │   │   ├── pricing/               # Pricing page
│   │   │   └── signup/                # Organization signup / onboarding
│   │   ├── (auth)/                     # Auth route group
│   │   │   ├── login/                  # Tenant-aware login
│   │   │   ├── register/              # Invite acceptance
│   │   │   └── forgot-password/
│   │   ├── (store)/                    # The Vault (member-facing store)
│   │   │   ├── layout.tsx             # Store layout: nav, balance pill, org branding
│   │   │   ├── page.tsx               # Catalog browse
│   │   │   ├── item/[slug]/           # Item detail
│   │   │   ├── cart/                  # Cart / claim review
│   │   │   ├── orders/               # User's order history
│   │   │   └── profile/              # User profile, balance, settings
│   │   ├── (admin)/                    # Admin dashboard
│   │   │   ├── layout.tsx             # Admin sidebar layout
│   │   │   ├── dashboard/            # Overview stats, activity feed
│   │   │   ├── catalog/              # Item CRUD
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   └── [id]/edit/
│   │   │   ├── users/                # User management
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   └── invite/
│   │   │   ├── currency/             # Currency config + distribution
│   │   │   │   ├── page.tsx
│   │   │   │   ├── distribute/
│   │   │   │   └── ledger/
│   │   │   ├── orders/               # Order fulfillment
│   │   │   └── settings/             # Org settings
│   │   │       ├── general/          # Name, branding, logo
│   │   │       ├── auth/             # Auth provider config (future: SSO)
│   │   │       └── billing/          # Subscription management (Phase 2)
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       └── v1/                    # Public REST API
│   │           ├── items/
│   │           ├── users/
│   │           ├── orders/
│   │           ├── currency/
│   │           └── webhooks/
│   ├── components/
│   │   ├── ui/                        # Primitives: Button, Input, Card, Modal, Badge
│   │   ├── store/                     # ItemCard, CartDrawer, BalancePill
│   │   ├── admin/                     # DataTable, StatCard, UserRow
│   │   └── shared/                    # Logo, ThemeProvider, Toaster, EmptyState
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts              # Drizzle client init (Supabase connection string)
│   │   │   ├── schema.ts             # Full database schema
│   │   │   ├── migrations/           # Drizzle migration files
│   │   │   └── tenant.ts             # Tenant context: set/get current tenant on connection
│   │   ├── auth/
│   │   │   ├── config.ts             # Auth.js config
│   │   │   └── utils.ts              # Session helpers, role guards, tenant-from-session
│   │   ├── storage/
│   │   │   └── supabase.ts           # Supabase Storage client (upload, signed URLs, delete)
│   │   ├── email/
│   │   │   ├── client.ts             # Resend client
│   │   │   └── templates/            # Invite, password reset, order confirmation
│   │   ├── currency/
│   │   │   └── engine.ts             # Atomic credit/debit/distribute operations
│   │   ├── tenant/
│   │   │   ├── resolve.ts            # Resolve org from subdomain
│   │   │   └── context.ts            # Request-scoped tenant context
│   │   ├── validators/               # Zod schemas
│   │   ├── errors.ts
│   │   ├── config.ts                 # Environment config loader
│   │   └── utils.ts
│   ├── hooks/                         # useBalance, useCart, useDebounce
│   ├── types/
│   └── proxy.ts                       # Subdomain routing, auth redirects, tenant resolution
├── supabase/
│   ├── migrations/                    # Supabase SQL migrations (RLS policies, functions)
│   └── seed.sql                       # Demo data
├── public/
│   └── brand/
├── .env.local.example
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Database Schema

All tables use Drizzle ORM in `src/lib/db/schema.ts`. Supabase SQL migrations in `supabase/migrations/` handle RLS policies and database functions.

### Multi-Tenant Core

#### `organizations`
Top-level tenant entity. No `tenant_id` — this IS the tenant.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | The `tenant_id` referenced everywhere else |
| `name` | `varchar(255)` | Display name |
| `slug` | `varchar(100)` UNIQUE | Subdomain identifier (e.g., `acme` → `acme.getswagvault.com`) |
| `logo_url` | `varchar(500)` | Org logo (Supabase Storage path) |
| `primary_color` | `varchar(7)` | Hex brand color |
| `currency_name` | `varchar(50)` | e.g., "Credits", "Coins", "Bucks" |
| `currency_symbol` | `varchar(10)` | e.g., "©", "⚡", "★" |
| `currency_icon_url` | `varchar(500)` | Optional custom icon |
| `plan` | `enum('pro', 'enterprise')` | Subscription tier |
| `trial_ends_at` | `timestamp` NULL | NULL after trial converts to paid. Set to 14 days from org creation. |
| `stripe_customer_id` | `varchar(255)` NULL | For billing (Phase 2) |
| `stripe_subscription_id` | `varchar(255)` NULL | Active subscription ID |
| `setup_complete` | `boolean` DEFAULT false | Onboarding flag |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `organization_members`
Maps users to organizations with their role. A user can belong to multiple organizations.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `user_id` | `uuid` FK → users | |
| `role` | `enum('owner', 'admin', 'manager', 'member')` | Role within this org |
| `is_active` | `boolean` DEFAULT true | |
| `joined_at` | `timestamp` | |

**Unique constraint:** `(tenant_id, user_id)` — one membership per user per org.

### Users

#### `users`
Global user accounts. Not tenant-scoped — a user can be a member of multiple orgs.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `varchar(255)` UNIQUE | Login identifier |
| `password_hash` | `varchar(255)` NULL | NULL if SSO-only user (future) |
| `display_name` | `varchar(100)` | |
| `avatar_url` | `varchar(500)` | |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

### Tenant-Scoped Tables

All remaining tables have a `tenant_id` column and RLS policies.

#### `balances`
Per-user, per-org currency balance. Separated from users because a user can have different balances in different orgs.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `user_id` | `uuid` FK → users | |
| `balance` | `integer` DEFAULT 0 | Current currency balance |
| `updated_at` | `timestamp` | |

**Unique constraint:** `(tenant_id, user_id)`

#### `items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `name` | `varchar(255)` | |
| `slug` | `varchar(255)` | Unique within tenant |
| `description` | `text` | Supports markdown |
| `price` | `integer` | Cost in currency units |
| `category_id` | `uuid` FK → categories NULL | |
| `image_urls` | `jsonb` | Array of Supabase Storage paths |
| `stock_quantity` | `integer` NULL | NULL = unlimited |
| `is_active` | `boolean` DEFAULT true | |
| `sort_order` | `integer` DEFAULT 0 | |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

**Unique constraint:** `(tenant_id, slug)`

#### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `name` | `varchar(100)` | |
| `slug` | `varchar(100)` | Unique within tenant |
| `sort_order` | `integer` DEFAULT 0 | |

**Unique constraint:** `(tenant_id, slug)`

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `order_number` | `integer` | Auto-incrementing per tenant |
| `user_id` | `uuid` FK → users | |
| `status` | `enum('pending', 'approved', 'fulfilled', 'cancelled')` | |
| `total_cost` | `integer` | |
| `notes` | `text` | Admin notes |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `order_id` | `uuid` FK → orders | |
| `item_id` | `uuid` FK → items | |
| `item_name` | `varchar(255)` | Snapshot at time of order |
| `item_price` | `integer` | Snapshot at time of order |
| `quantity` | `integer` DEFAULT 1 | |

#### `transactions`
Immutable ledger. Source of truth for all currency movement. `balances.balance` is a denormalized cache.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `user_id` | `uuid` FK → users | Who was affected |
| `type` | `enum('credit', 'debit', 'adjustment')` | |
| `amount` | `integer` | Always positive; type determines direction |
| `balance_after` | `integer` | Snapshot after this transaction |
| `reason` | `varchar(255)` | e.g., "Admin distribution", "Order #142" |
| `reference_type` | `varchar(50)` NULL | e.g., "order", "distribution", "manual" |
| `reference_id` | `uuid` NULL | |
| `performed_by` | `uuid` FK → users | |
| `created_at` | `timestamp` | |

#### `api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `name` | `varchar(100)` | |
| `key_hash` | `varchar(255)` | |
| `key_prefix` | `varchar(10)` | First 8 chars for identification |
| `permissions` | `jsonb` | |
| `created_by` | `uuid` FK → users | |
| `last_used_at` | `timestamp` NULL | |
| `created_at` | `timestamp` | |

#### `webhook_endpoints`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `tenant_id` | `uuid` FK → organizations | |
| `url` | `varchar(500)` | |
| `events` | `jsonb` | |
| `secret` | `varchar(255)` | HMAC signing secret |
| `is_active` | `boolean` DEFAULT true | |
| `created_at` | `timestamp` | |

### Row Level Security (RLS)

Apply to ALL tenant-scoped tables via Supabase SQL migration:

```sql
-- Example for items table (repeat pattern for all tenant-scoped tables)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
```

### Tenant Context Helper

```sql
-- Function to set tenant context on a connection
CREATE OR REPLACE FUNCTION set_tenant(tid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tid::text, true); -- true = LOCAL (transaction-scoped)
END;
$$ LANGUAGE plpgsql;
```

In the application (`src/lib/db/tenant.ts`):

```typescript
export async function withTenant<T>(tenantId: string, fn: (db: DrizzleClient) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_tenant(${tenantId}::uuid)`);
    return fn(tx);
  });
}
```

Every data-access function in the application MUST use `withTenant()` to ensure RLS is enforced.

---

## Supabase Storage

### Bucket Structure

```
swagvault-assets/
├── {tenant_id}/
│   ├── logo/
│   │   └── org-logo.png
│   ├── items/
│   │   ├── {item_id}/
│   │   │   ├── main.jpg
│   │   │   ├── gallery-1.jpg
│   │   │   └── gallery-2.jpg
│   └── currency/
│       └── icon.png
```

### Storage Policies

- Bucket is **private** — all access via signed URLs or server-side reads.
- Upload: Admin/manager roles only, scoped to their `tenant_id` path prefix.
- Read: Signed URLs generated server-side with short expiry (1 hour) for item images. Longer expiry for logos (24 hours, cached).
- Max file size: 5MB per image.
- Allowed types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`.

### Storage Client (`src/lib/storage/supabase.ts`)

```typescript
export async function uploadItemImage(tenantId: string, itemId: string, file: File): Promise<string>
export async function getSignedUrl(path: string, expiresIn?: number): Promise<string>
export async function deleteItemImages(tenantId: string, itemId: string): Promise<void>
export async function uploadOrgLogo(tenantId: string, file: File): Promise<string>
```

---

## Core Business Logic

### Currency Engine (`src/lib/currency/engine.ts`)

All currency operations MUST be atomic database transactions via `withTenant()`. Never update `balances.balance` without inserting a `transactions` record.

```
creditUser(tenantId, userId, amount, reason, performedBy, reference?)
  → withTenant(tenantId, async (tx) => {
      INSERT into transactions
      UPDATE balances SET balance = balance + amount
      RETURN { newBalance, transaction }
    })

debitUser(tenantId, userId, amount, reason, performedBy, reference?)
  → withTenant(tenantId, async (tx) => {
      SELECT balance FROM balances WHERE user_id = userId FOR UPDATE
      IF balance < amount → throw InsufficientBalanceError
      INSERT into transactions
      UPDATE balances SET balance = balance - amount
      RETURN { newBalance, transaction }
    })

bulkDistribute(tenantId, userIds[], amount, reason, performedBy)
  → withTenant(tenantId, async (tx) => {
      For each user: INSERT transaction + UPDATE balance
      RETURN { count, totalDistributed }
    })
```

### Order Flow

1. **Cart** → Client-side state (React context). No server-side cart.
2. **Submit order** → Validate items, check stock, calculate total, `debitUser()`, create order + order_items, decrement stock. All in one transaction.
3. **Admin fulfills** → `pending` → `approved` → `fulfilled`
4. **Admin cancels** → `creditUser()` refund, restore stock, status → `cancelled`

### Role Permissions

| Action | Owner | Admin | Manager | Member |
|---|---|---|---|---|
| Browse store / place orders | ✅ | ✅ | ✅ | ✅ |
| View own balance & history | ✅ | ✅ | ✅ | ✅ |
| View all users & balances | ✅ | ✅ | ✅ | ❌ |
| Distribute currency | ✅ | ✅ | ✅ | ❌ |
| Manage catalog items | ✅ | ✅ | ✅ | ❌ |
| Manage order fulfillment | ✅ | ✅ | ✅ | ❌ |
| Manage users & roles | ✅ | ✅ | ❌ | ❌ |
| Org settings & branding | ✅ | ✅ | ❌ | ❌ |
| Billing & subscription | ✅ | ❌ | ❌ | ❌ |
| Delete organization | ✅ | ❌ | ❌ | ❌ |

The **owner** role is assigned to whoever creates the organization. It cannot be reassigned without a support request. This prevents accidental lockout.

---

## Onboarding Flow

When a new user signs up at `getswagvault.com/signup`:

1. **Create Account** — Email + password (or "Continue with Microsoft" in future)
2. **Select Plan** — Choose Pro or Enterprise (with a 14-day free trial, no credit card required to start)
3. **Create Organization** — Org name, choose a subdomain slug (live availability check), upload logo (optional)
4. **Configure Currency** — Name your currency, pick a symbol/icon
5. **Invite Team** (optional, skippable) — Enter email addresses to send invite links
6. **Done** — "Your Vault is ready." → Redirect to `{slug}.getswagvault.com/admin/dashboard`

The user who completes signup becomes the **owner** of the organization. A `balances` record is created for them with 0 balance.

---

## UI / UX Specifications

### Design System

- **Colors**: Deep navy (`#0a0e1a`) as the dark theme base. Gold (`#c9a84c`) as the accent. Support dark/light mode — light mode uses slate grays with gold accent.
- **Typography**: `DM Sans` for the app. `Playfair Display` reserved for marketing pages only.
- **Radius**: 8px buttons/inputs, 12px cards, 16px modals.
- **Shadows**: Minimal. Border + background shifts for elevation.

### Auth Pages

**Login (`/login`)**
- Tenant-aware: branded with the org's logo and name (resolved from subdomain).
- Email + password form.
- Future: "Sign in with Microsoft" button when SSO is active.
- "Forgot Password" link.
- Error states: invalid credentials, account disabled, org not found.

### Store Pages (The Vault)

**Catalog Browse (`/`)**
- Grid layout (3-4 columns desktop, 2 mobile)
- Item card: image, name, price, stock indicator
- Category filter sidebar (collapsible on mobile)
- Search bar with instant filter
- Vault Balance pill always visible in header

**Item Detail (`/item/[slug]`)**
- Large image with gallery
- Name, description (markdown), price, stock
- "Claim from Vault" button (disabled states for insufficient balance / out of stock)
- Related items

**Cart (`/cart`)**
- Line items with quantity, price, subtotal
- Total vs. current balance comparison
- Clear insufficient balance indicator
- "Claim" CTA

**Orders (`/orders`)**
- List with status badges, click into detail

### Admin Dashboard

**Overview** — Stat cards (users, currency in circulation, active items, pending orders), activity feed, quick actions.

**Catalog** — Data table, inline active/inactive toggle, bulk actions, drag-and-drop image upload, markdown editor.

**Users** — Data table (name, email, role, balance, status), user detail with balance history, bulk distribute, invite flow.

**Currency / Ledger** — Distribute form, full ledger table, CSV export.

**Orders** — Table grouped by status, detail view with timeline, fulfillment notes.

**Settings** — Org name/logo/color, currency config, auth providers (future), billing (Phase 2).

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>          # Server-side only, never exposed
DATABASE_URL=postgresql://postgres:xxxxx@db.xxxxx.supabase.co:5432/postgres

# Auth
NEXTAUTH_SECRET=<random-32-char-string>
NEXTAUTH_URL=https://getswagvault.com

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=SwagVault <noreply@getswagvault.com>

# App
NEXT_PUBLIC_APP_DOMAIN=getswagvault.com               # Used for subdomain construction
```

---

## Development Phases

### Phase 1 — Core Product (MVP)
**Goal: A working multi-tenant store. An admin can sign up, create an org, stock items, distribute currency, and members can browse and claim. Deployed on Vercel + Supabase.**

1. Project scaffolding: Next.js 16 + TypeScript + Tailwind + Drizzle + Supabase
2. Supabase project setup: database, storage bucket, RLS policies
3. Database schema + migrations (all tables, RLS, tenant functions)
4. `withTenant()` helper and tenant context system
5. Auth system: Auth.js credentials provider, session management
6. `proxy.ts`: subdomain extraction, tenant resolution, auth redirects
7. Signup + onboarding flow (create account → create org → configure currency)
8. Currency engine (credit, debit, bulk distribute — all tenant-scoped)
9. Item CRUD (admin) + Supabase Storage image uploads
10. Catalog browse (store) — use `"use cache"` with tenant-scoped cache tags
11. Cart + order placement flow
12. Order management (admin: status updates, cancellation with refund)
13. User management (invite via email, role assignment, balance view)
14. Currency distribution (single + bulk)
15. Transaction ledger (admin view)
16. Basic responsive UI for all pages
17. Deploy to Vercel with wildcard subdomain config
18. Marketing landing page at root domain

### Phase 2 — Polish, Billing & SSO
**Goal: Production-ready for paying customers.**

1. Stripe integration: subscription billing, trial period, payment collection
2. Billing settings page (manage subscription, invoices, upgrade/downgrade)
3. Plan enforcement: Pro vs Enterprise tier limits (e.g., user caps, storage, API access)
4. Microsoft Entra ID SSO (OAuth via Auth.js MicrosoftEntraID provider)
5. Admin dashboard with stats + activity feed
6. User profile page with balance history
7. Dark/light mode toggle
8. React Compiler: enable in `next.config.ts`, measure performance
9. View Transitions for navigation animations
10. Search + category filtering on catalog
11. Image gallery on item detail pages
12. Markdown rendering for item descriptions
13. CSV export for ledger and user data
14. Email notifications (invites, order confirmations, status updates)
15. Pagination + sorting on all data tables
16. Empty states, loading skeletons, error boundaries, toasts
17. README + documentation site

### Phase 3 — API & Integrations
**Goal: Platform ecosystem for power users.**

1. REST API (v1) with API key auth
2. Webhook system (event dispatch, HMAC signing, retry logic)
3. Slack integration (balance check, drop notifications)
4. Microsoft Teams integration
5. Zapier / n8n webhook templates
6. Rate limiting on API endpoints
7. Audit log for admin actions
8. Public API documentation (OpenAPI spec)

### Phase 4 — Growth & Enterprise
**Goal: Enterprise features and expansion.**

1. Additional SSO providers (Google Workspace, Okta SAML)
2. Advanced analytics dashboard (trends, top items, engagement)
3. Org theming system (custom CSS, beyond just color + logo)
4. Self-hosted Docker package — the **free tier** of SwagVault (extract from SaaS codebase, remove multi-tenancy layer, add LDAP/AD support)
5. Public-facing docs site

---

## Testing Strategy

- **Unit tests**: Currency engine, tenant context, validators, utils. Use Vitest.
- **Integration tests**: API routes with test tenant. Use Vitest + Supabase local dev (Docker for local Supabase).
- **E2E tests**: Signup → create org → distribute → browse → order → fulfill. Use Playwright.
- **Multi-tenant tests**: Verify tenant isolation — create two tenants, confirm data never leaks across boundaries.
- **CI**: GitHub Actions — lint, type-check, unit tests, integration tests on every PR. E2E on main branch.

---

## Implementation Notes for Claude Code

1. **Start with Phase 1 only.** Do not scaffold Phase 2-4 code.
2. **Database first.** Schema, migrations, RLS policies, and `withTenant()` must be solid before touching UI.
3. **RLS is your safety net.** Every tenant-scoped table gets RLS. Every data access goes through `withTenant()`. Test tenant isolation early and often.
4. **Currency operations are sacred.** Every balance change goes through the currency engine. No direct balance updates. All operations use `withTenant()` with `FOR UPDATE` row locks.
5. **Server components by default.** Client components only for interactivity. All params/searchParams are async in Next.js 16.
6. **Validate everything.** Zod schemas for all API inputs and form submissions.
7. **No premature abstraction.** If it's not in the current phase, it doesn't exist.
8. **Mobile-first responsive.**
9. **Accessible by default.** Semantic HTML, ARIA labels, keyboard navigation.
10. **Error handling.** Every API route: try/catch with meaningful responses. Every UI action: loading, success, error states.
11. **Keep the vault metaphor.** "Vault Balance", "Claim", "Vault Ledger", "Credits", etc.
12. **Use `proxy.ts`, not `middleware.ts`.** Handles subdomain routing, tenant resolution, auth redirects.
13. **Opt-in caching only.** `"use cache"` with `cacheLife()` / `cacheTag()` on catalog-type pages. Include `tenant_id` in cache tags to prevent cross-tenant cache leaks (e.g., `cacheTag(\`catalog-${tenantId}\`)`).
14. **Supabase Storage for all files.** No local filesystem. All uploads go to the tenant-prefixed path in the storage bucket.
15. **Never trust the subdomain alone for authorization.** Always verify the authenticated user is a member of the resolved tenant organization.
