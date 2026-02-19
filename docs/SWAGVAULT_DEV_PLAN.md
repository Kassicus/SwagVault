# SwagVault — Development Plan

## Project Overview

**SwagVault** is a self-hostable eStore platform that allows businesses and schools to manage a custom digital currency used to purchase company/organization swag. It ships as both a **free self-hosted package** (Docker) and a **managed hosted SaaS** offering.

The product must be opinionated, simple to deploy, and feel like a polished SaaS product from day one — not an open-source science project. Think Plausible Analytics or Gitea: professional, self-contained, and just works.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | Single deployable handles UI + API. Turbopack default bundler. Explicit caching via Cache Components. Ideal for self-hosting (one process). |
| **Language** | TypeScript (strict mode) | Type safety across the full stack. |
| **Database** | PostgreSQL 16 | Robust, self-host friendly, excellent for transactional currency operations. |
| **ORM** | Drizzle ORM | Type-safe, lightweight, SQL-first. No magic — easy to reason about for a solo dev. |
| **Auth** | NextAuth.js (Auth.js v5) | Credential provider for self-hosted, Microsoft Entra ID (Azure AD) OAuth for hosted SSO, LDAP adapter for on-prem Active Directory. |
| **LDAP** | ldapjs | Pure JS LDAP client for Active Directory bind-and-search authentication. No native dependencies — runs cleanly in Docker. |
| **Styling** | Tailwind CSS 4 | Matches the brand system we established. Utility-first, no component library lock-in. |
| **File Storage** | Local filesystem (self-hosted) / S3-compatible (hosted) | Abstracted behind a storage interface so either backend is swappable. |
| **Email** | Nodemailer (self-hosted SMTP) / Resend (hosted) | Transactional emails for invites, password resets, order confirmations. |
| **Containerization** | Docker + Docker Compose | Single `docker compose up` deployment for self-hosted users. |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution. |

---

## Next.js 16 Conventions & Requirements

This project targets **Next.js 16.1+** (latest stable). The following framework-specific conventions MUST be followed throughout the codebase:

### Turbopack (Default Bundler)
- Turbopack is the default bundler in Next.js 16 — no `--turbopack` flags needed in `package.json` scripts.
- Do NOT add custom webpack configuration. If a third-party library requires webpack-specific config, use Turbopack-compatible options or run `next build --webpack` as a fallback.
- File system caching is stable for `next dev` in 16.1 — compilation artifacts persist in `.next` between restarts.

### Async Params & SearchParams
- **All route params and searchParams are now async.** Every page, layout, route handler, and metadata function must `await` params before use.
```tsx
// ✅ Correct — Next.js 16
export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}

// ❌ Wrong — Next.js 15 style (will not work)
export default function ItemPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
}
```
- This applies to `generateMetadata`, `generateStaticParams`, route handlers, and dynamic image generation functions.

### Proxy (Replaces Middleware)
- `middleware.ts` has been renamed to `proxy.ts` with an exported `proxy` function.
- Proxy runs on the **Node.js runtime only** (not edge). This is fine for our self-hosted use case.
- Use `proxy.ts` for auth redirects (protecting admin routes, redirecting unauthenticated users).
```tsx
// src/proxy.ts
export function proxy(request: Request) {
  // Auth checks, redirects, etc.
}
```

### Cache Components & `"use cache"`
- Caching in Next.js 16 is **entirely opt-in**. All dynamic code runs at request time by default.
- Use the `"use cache"` directive on pages, components, or functions that should be cached.
- Use `cacheLife()` and `cacheTag()` (now stable, no `unstable_` prefix) for explicit cache control.
- For SwagVault, most pages are dynamic (user-specific balances, cart state). Cache candidates include:
  - Public catalog pages (with revalidation on item updates)
  - Category listings
  - Instance settings / branding data
```tsx
// Example: cached catalog page that revalidates when items change
"use cache"
import { cacheLife, cacheTag } from 'next/cache'

export default async function CatalogPage() {
  cacheLife('minutes')       // Cache for a few minutes
  cacheTag('catalog')        // Tag for targeted revalidation
  const items = await getActiveItems();
  return <CatalogGrid items={items} />;
}
```
- When an admin updates an item, call `revalidateTag('catalog')` in the server action.

### React 19.2 Features
- **View Transitions**: Use for page navigation animations (store → item detail, admin tab switches).
- **React Compiler**: Stable and opt-in. Enable in `next.config.ts` with `reactCompiler: true` once the app is functional. Do not enable during initial development — add it in Phase 2 as a performance optimization.

### Node.js Requirement
- Minimum Node.js version: **20.9.0**. Set this in `package.json` engines field and in the Dockerfile.

---

## Authentication Architecture

SwagVault supports three authentication strategies. The active strategy is determined by environment configuration and instance settings. Multiple strategies can be enabled simultaneously (e.g., credentials + LDAP on self-hosted, credentials + Microsoft SSO on hosted).

### Strategy 1: Credentials (Default — All Deployments)
- Email + password login. Always available as a fallback.
- Passwords hashed with bcrypt (cost factor 12).
- Admin creates users via invite flow (sends email with setup link) or users self-register if enabled in settings.
- Password reset via email token (time-limited, single-use).

### Strategy 2: Microsoft Entra ID / Azure AD SSO (Hosted Offering)
- OAuth 2.0 / OpenID Connect flow via the Auth.js `MicrosoftEntraID` provider.
- Designed for the managed hosted product where organizations connect their Microsoft 365 tenant.
- **Setup flow (admin):**
  1. Admin navigates to Settings → Authentication → Microsoft SSO
  2. Admin provides their Entra ID **Tenant ID**, **Client ID**, and **Client Secret** (from their Azure App Registration)
  3. SwagVault stores these encrypted in `auth_providers` table
  4. Admin is given the **Redirect URI** to add to their Azure App Registration (`https://{subdomain}.getswagvault.com/api/auth/callback/microsoft-entra-id`)
  5. Admin toggles SSO to active
- **Login flow:**
  1. User clicks "Sign in with Microsoft" on login page
  2. Redirected to Microsoft login → consent → callback
  3. SwagVault receives the ID token with `email`, `name`, `oid` (object ID)
  4. If a user with that email exists → log them in
  5. If no user exists → auto-provision with `member` role (configurable: admin can disable auto-provisioning and require pre-created accounts)
  6. Store the `oid` in `users.external_id` for future matching
- **Group mapping (optional):** If the Azure App Registration includes the `GroupMember.Read.All` scope, SwagVault can map Entra ID security groups to SwagVault roles (e.g., "SwagVault Admins" group → admin role).

### Strategy 3: LDAP / Active Directory (Self-Hosted Docker)
- Bind-and-search LDAP authentication for organizations running on-prem Active Directory.
- Uses the `ldapjs` library for LDAP operations.
- **Setup flow (admin):**
  1. Admin navigates to Settings → Authentication → Active Directory
  2. Admin provides connection details:
     - **Server URL**: `ldap://dc.corp.local:389` or `ldaps://dc.corp.local:636`
     - **Bind DN**: Service account DN (e.g., `CN=svc_swagvault,OU=Service Accounts,DC=corp,DC=local`)
     - **Bind Password**: Service account password (stored encrypted)
     - **Search Base**: Where to search for users (e.g., `OU=Employees,DC=corp,DC=local`)
     - **Search Filter**: LDAP filter template (default: `(&(objectClass=user)(sAMAccountName={{username}})`)
     - **Username Attribute**: Which LDAP attribute is the login identifier (default: `sAMAccountName`)
     - **Email Attribute**: default `mail`
     - **Display Name Attribute**: default `displayName`
  3. Admin clicks "Test Connection" to validate settings
  4. Admin toggles LDAP to active
- **Login flow:**
  1. User enters their AD username + password on login page
  2. SwagVault binds to AD with the service account
  3. Searches for the user using the configured filter
  4. If found → attempts to bind as the user with their provided password
  5. If bind succeeds → authentication successful
  6. Extract `email`, `displayName` from the LDAP entry
  7. If a SwagVault user with that email exists → log them in, update `external_id` with the LDAP `objectGUID`
  8. If no user exists → auto-provision with `member` role (configurable)
  9. Session is managed by Auth.js (not LDAP) — the LDAP server is only consulted at login time
- **TLS/STARTTLS:** Support both `ldaps://` (implicit TLS) and STARTTLS on port 389. Allow admins to toggle "Allow untrusted certificates" for self-signed CA environments (common in on-prem).
- **Group mapping (optional):** Query `memberOf` attribute to map AD groups to SwagVault roles.

### Auth Configuration Model

The auth system should be built as a provider registry pattern:

```
src/lib/auth/
├── config.ts              # Auth.js config — dynamically loads active providers
├── providers/
│   ├── credentials.ts     # Email + password provider
│   ├── microsoft-sso.ts   # Entra ID OAuth provider (reads config from DB)
│   └── ldap.ts            # LDAP bind-and-search provider (custom credentials provider)
├── ldap-client.ts         # LDAP connection, bind, search operations
├── utils.ts               # Session helpers, role guards
└── encryption.ts          # Encrypt/decrypt secrets stored in DB (AES-256-GCM)
```

Auth.js config dynamically reads from the `auth_providers` table at startup and on settings change. The LDAP provider is implemented as a custom Auth.js `CredentialsProvider` that validates against AD instead of the local password hash.

---

## Project Structure

```
swagvault/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml          # Production compose (app + postgres)
│   ├── docker-compose.dev.yml      # Dev compose with hot reload
│   └── .env.example
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Auth route group
│   │   │   ├── login/              # Login page (credentials + SSO/LDAP buttons based on active providers)
│   │   │   ├── register/           # First-run setup / invite acceptance
│   │   │   └── forgot-password/
│   │   ├── (store)/                # Public-facing store (The Vault)
│   │   │   ├── layout.tsx          # Store layout with nav, balance display
│   │   │   ├── page.tsx            # Store homepage / catalog browse
│   │   │   ├── item/[slug]/        # Individual item detail page
│   │   │   ├── cart/               # Cart / claim review
│   │   │   ├── orders/             # User's order history
│   │   │   └── profile/            # User profile, balance, settings
│   │   ├── (admin)/                # Admin dashboard
│   │   │   ├── layout.tsx          # Admin sidebar layout
│   │   │   ├── dashboard/          # Overview stats, recent activity
│   │   │   ├── catalog/            # Manage items (CRUD)
│   │   │   │   ├── page.tsx        # Item list
│   │   │   │   ├── new/            # Add new item
│   │   │   │   └── [id]/edit/      # Edit existing item
│   │   │   ├── users/              # User management
│   │   │   │   ├── page.tsx        # User list with balances
│   │   │   │   ├── [id]/           # Individual user detail
│   │   │   │   └── invite/         # Invite new users
│   │   │   ├── currency/           # Currency settings
│   │   │   │   ├── page.tsx        # Config: name, symbol, icon
│   │   │   │   ├── distribute/     # Bulk distribute currency
│   │   │   │   └── ledger/         # Full transaction ledger
│   │   │   ├── orders/             # All orders / fulfillment queue
│   │   │   └── settings/           # Instance settings
│   │   │       ├── general/        # Org name, branding, logo
│   │   │       ├── auth/           # Authentication providers
│   │   │       │   ├── page.tsx    # Auth provider overview (active methods)
│   │   │       │   ├── microsoft/  # Microsoft Entra ID SSO config
│   │   │       │   └── ldap/       # Active Directory / LDAP config
│   │   │       ├── email/          # SMTP / email provider config
│   │   │       └── api/            # API keys, webhook config
│   │   └── api/                    # API routes
│   │       ├── auth/[...nextauth]/ # Auth.js handler
│   │       ├── v1/                 # Public REST API (versioned)
│   │       │   ├── items/
│   │       │   ├── users/
│   │       │   ├── orders/
│   │       │   ├── currency/
│   │       │   └── webhooks/
│   │       └── internal/           # Internal API (admin actions)
│   │           ├── upload/
│   │           ├── distribute/
│   │           └── setup/
│   ├── components/
│   │   ├── ui/                     # Primitives: Button, Input, Card, Modal, Badge, etc.
│   │   ├── store/                  # Store-specific: ItemCard, CartDrawer, BalancePill
│   │   ├── admin/                  # Admin-specific: DataTable, StatCard, UserRow
│   │   └── shared/                 # Logo, ThemeProvider, Toaster, EmptyState
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts            # Drizzle client init
│   │   │   ├── schema.ts           # Full database schema
│   │   │   └── migrations/         # Generated migration files
│   │   ├── auth/
│   │   │   ├── config.ts           # Auth.js config — dynamically loads active providers
│   │   │   ├── providers/
│   │   │   │   ├── credentials.ts  # Email + password provider
│   │   │   │   ├── microsoft-sso.ts # Entra ID OAuth provider (reads config from DB)
│   │   │   │   └── ldap.ts         # LDAP bind-and-search (custom credentials provider)
│   │   │   ├── ldap-client.ts      # LDAP connection, bind, search operations
│   │   │   ├── encryption.ts       # AES-256-GCM encrypt/decrypt for stored secrets
│   │   │   └── utils.ts            # Session helpers, role guards
│   │   ├── storage/
│   │   │   ├── interface.ts        # Storage adapter interface
│   │   │   ├── local.ts            # Local filesystem adapter
│   │   │   └── s3.ts               # S3-compatible adapter
│   │   ├── email/
│   │   │   ├── interface.ts        # Email adapter interface
│   │   │   ├── smtp.ts             # Nodemailer / SMTP adapter
│   │   │   └── templates/          # Email templates (invite, reset, order confirmation)
│   │   ├── currency/
│   │   │   └── engine.ts           # Core currency operations (credit, debit, transfer)
│   │   ├── validators/             # Zod schemas for all inputs
│   │   ├── errors.ts               # Custom error classes
│   │   ├── config.ts               # Environment / instance configuration loader
│   │   └── utils.ts                # Shared utilities
│   ├── hooks/                      # React hooks (useBalance, useCart, useDebounce)
│   └── types/                      # Shared TypeScript types/interfaces
├── src/
│   └── proxy.ts                    # Auth redirects, route protection (replaces middleware.ts)
├── public/
│   └── brand/                      # Default SwagVault branding assets
├── scripts/
│   ├── setup.ts                    # First-run setup script
│   ├── seed.ts                     # Demo data seeder
│   └── migrate.ts                  # Migration runner
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Database Schema

Design the schema in `src/lib/db/schema.ts` using Drizzle ORM. All currency operations MUST use database transactions to prevent balance inconsistencies.

### Tables

#### `instance_settings`
Singleton table storing instance-wide configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | Always a single row |
| `org_name` | `varchar(255)` | Organization display name |
| `currency_name` | `varchar(50)` | e.g., "Credits", "Coins", "Bucks" |
| `currency_symbol` | `varchar(10)` | e.g., "©", "⚡", "★" |
| `currency_icon_url` | `varchar(500)` | Optional custom icon |
| `logo_url` | `varchar(500)` | Org logo |
| `primary_color` | `varchar(7)` | Hex brand color |
| `setup_complete` | `boolean` | First-run flag |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `email` | `varchar(255)` UNIQUE | Login identifier |
| `password_hash` | `varchar(255)` | bcrypt hashed |
| `display_name` | `varchar(100)` | |
| `avatar_url` | `varchar(500)` | |
| `role` | `enum('admin', 'manager', 'member')` | Permission tier |
| `balance` | `integer` DEFAULT 0 | Current currency balance (stored as integer, no decimals) |
| `is_active` | `boolean` DEFAULT true | Soft disable |
| `auth_provider` | `varchar(50)` DEFAULT 'credentials' | How this user authenticates: 'credentials', 'microsoft-sso', 'ldap' |
| `external_id` | `varchar(255)` NULL | External identity: Entra `oid` or LDAP `objectGUID` |
| `invited_by` | `uuid` FK → users | |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `varchar(255)` | |
| `slug` | `varchar(255)` UNIQUE | URL-safe identifier |
| `description` | `text` | Supports markdown |
| `price` | `integer` | Cost in currency units |
| `category_id` | `uuid` FK → categories | |
| `image_urls` | `jsonb` | Array of image paths |
| `stock_quantity` | `integer` NULL | NULL = unlimited |
| `is_active` | `boolean` DEFAULT true | Visible in store |
| `sort_order` | `integer` DEFAULT 0 | Manual ordering |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `categories`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `varchar(100)` | |
| `slug` | `varchar(100)` UNIQUE | |
| `sort_order` | `integer` DEFAULT 0 | |

#### `orders`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `order_number` | `serial` | Human-readable incrementing number |
| `user_id` | `uuid` FK → users | |
| `status` | `enum('pending', 'approved', 'fulfilled', 'cancelled')` | Fulfillment workflow |
| `total_cost` | `integer` | Total currency spent |
| `notes` | `text` | Admin notes |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

#### `order_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `order_id` | `uuid` FK → orders | |
| `item_id` | `uuid` FK → items | |
| `item_name` | `varchar(255)` | Snapshot at time of order |
| `item_price` | `integer` | Snapshot at time of order |
| `quantity` | `integer` DEFAULT 1 | |

#### `transactions`
Immutable ledger of all currency movements. This is the source of truth — `users.balance` is a denormalized cache that must stay in sync.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | Who was affected |
| `type` | `enum('credit', 'debit', 'adjustment')` | Direction |
| `amount` | `integer` | Always positive; type determines direction |
| `balance_after` | `integer` | Balance snapshot after this transaction |
| `reason` | `varchar(255)` | e.g., "Admin distribution", "Order #142", "Manual adjustment" |
| `reference_type` | `varchar(50)` NULL | e.g., "order", "distribution", "manual" |
| `reference_id` | `uuid` NULL | FK to related entity |
| `performed_by` | `uuid` FK → users | Admin or system who initiated |
| `created_at` | `timestamp` | |

#### `api_keys`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `varchar(100)` | Human label |
| `key_hash` | `varchar(255)` | Hashed API key (show raw key only on creation) |
| `key_prefix` | `varchar(10)` | First 8 chars for identification |
| `permissions` | `jsonb` | Scoped permission set |
| `created_by` | `uuid` FK → users | |
| `last_used_at` | `timestamp` NULL | |
| `created_at` | `timestamp` | |

#### `webhook_endpoints`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `url` | `varchar(500)` | Target URL |
| `events` | `jsonb` | Array of event types to subscribe to |
| `secret` | `varchar(255)` | HMAC signing secret |
| `is_active` | `boolean` DEFAULT true | |
| `created_at` | `timestamp` | |

#### `auth_providers`
Stores configuration for external auth providers. Secrets are encrypted at rest using AES-256-GCM with a key derived from `AUTH_ENCRYPTION_KEY` env var.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `type` | `enum('microsoft-sso', 'ldap')` | Provider type |
| `is_active` | `boolean` DEFAULT false | Whether this provider is enabled for login |
| `config` | `jsonb` | Provider-specific config (non-secret fields) |
| `encrypted_secrets` | `text` | AES-256-GCM encrypted JSON blob of secrets (client secret, bind password, etc.) |
| `auto_provision` | `boolean` DEFAULT true | Auto-create SwagVault users on first SSO/LDAP login |
| `default_role` | `enum('admin', 'manager', 'member')` DEFAULT 'member' | Role assigned to auto-provisioned users |
| `group_mappings` | `jsonb` NULL | Map external groups to SwagVault roles (e.g., `{"SwagVault Admins": "admin"}`) |
| `created_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

**`config` field examples:**

Microsoft SSO:
```json
{
  "tenant_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "client_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "scopes": ["openid", "profile", "email", "GroupMember.Read.All"]
}
```

LDAP / Active Directory:
```json
{
  "server_url": "ldaps://dc.corp.local:636",
  "bind_dn": "CN=svc_swagvault,OU=Service Accounts,DC=corp,DC=local",
  "search_base": "OU=Employees,DC=corp,DC=local",
  "search_filter": "(&(objectClass=user)(sAMAccountName={{username}}))",
  "username_attribute": "sAMAccountName",
  "email_attribute": "mail",
  "display_name_attribute": "displayName",
  "tls_allow_untrusted": false,
  "starttls": false
}
```

---

## Core Business Logic

### Currency Engine (`src/lib/currency/engine.ts`)

This is the most critical module. All currency operations MUST be atomic database transactions. Never update `users.balance` without also inserting a `transactions` record.

```
creditUser(userId, amount, reason, performedBy, reference?)
  → BEGIN TRANSACTION
  → INSERT into transactions
  → UPDATE users SET balance = balance + amount WHERE id = userId
  → COMMIT
  → RETURN { newBalance, transaction }

debitUser(userId, amount, reason, performedBy, reference?)
  → BEGIN TRANSACTION
  → SELECT balance FROM users WHERE id = userId FOR UPDATE (row lock)
  → IF balance < amount → ROLLBACK, throw InsufficientBalanceError
  → INSERT into transactions
  → UPDATE users SET balance = balance - amount WHERE id = userId
  → COMMIT
  → RETURN { newBalance, transaction }

bulkDistribute(userIds[], amount, reason, performedBy)
  → BEGIN TRANSACTION
  → For each user: INSERT transaction + UPDATE balance
  → COMMIT
  → RETURN { count, totalDistributed }
```

### Order Flow

1. **User adds items to cart** → Client-side state (React context or zustand), no server state for cart
2. **User submits order** →
   - Validate all items still exist and are active
   - Validate stock availability
   - Calculate total
   - `debitUser()` for the total amount (atomic)
   - Create `order` + `order_items` records
   - Decrement stock quantities
   - If any step fails, entire transaction rolls back
3. **Admin reviews order** → Status: `pending` → `approved` → `fulfilled`
4. **Admin cancels order** →
   - `creditUser()` to refund the amount
   - Restore stock quantities
   - Status → `cancelled`

### Role Permissions

| Action | Admin | Manager | Member |
|---|---|---|---|
| Browse store / place orders | ✅ | ✅ | ✅ |
| View own balance & history | ✅ | ✅ | ✅ |
| View all users & balances | ✅ | ✅ | ❌ |
| Distribute currency | ✅ | ✅ | ❌ |
| Manage catalog items | ✅ | ✅ | ❌ |
| Manage order fulfillment | ✅ | ✅ | ❌ |
| Manage users & roles | ✅ | ❌ | ❌ |
| Instance settings | ✅ | ❌ | ❌ |
| API key management | ✅ | ❌ | ❌ |

---

## API Design (v1)

RESTful, JSON request/response. All endpoints require either session auth (cookie) or API key (Bearer token in Authorization header).

### Public API Endpoints

```
GET    /api/v1/items                    # List items (paginated, filterable)
GET    /api/v1/items/:slug              # Get single item
GET    /api/v1/categories               # List categories

GET    /api/v1/users/me                 # Current user profile + balance
GET    /api/v1/users/me/transactions    # Current user's transaction history
GET    /api/v1/users/me/orders          # Current user's orders

POST   /api/v1/orders                   # Place an order (from cart)
GET    /api/v1/orders/:id               # Get order details

GET    /api/v1/settings/public          # Instance name, currency config, branding
```

### Admin API Endpoints

```
# Users
GET    /api/v1/admin/users              # List all users
POST   /api/v1/admin/users              # Create / invite user
PATCH  /api/v1/admin/users/:id          # Update user (role, active status)
GET    /api/v1/admin/users/:id          # User detail with full history

# Currency
POST   /api/v1/admin/currency/distribute    # Distribute to one or many users
POST   /api/v1/admin/currency/adjust        # Manual balance adjustment
GET    /api/v1/admin/currency/ledger        # Full transaction ledger

# Catalog
POST   /api/v1/admin/items              # Create item
PATCH  /api/v1/admin/items/:id          # Update item
DELETE /api/v1/admin/items/:id          # Soft delete / deactivate item

# Orders
GET    /api/v1/admin/orders             # All orders (filterable by status)
PATCH  /api/v1/admin/orders/:id         # Update status (approve, fulfill, cancel)

# Settings
GET    /api/v1/admin/settings           # Full instance settings
PATCH  /api/v1/admin/settings           # Update settings

# Webhooks
POST   /api/v1/admin/webhooks           # Register endpoint
DELETE /api/v1/admin/webhooks/:id       # Remove endpoint
```

### Webhook Events

When webhooks are configured, fire signed POST requests for:

- `order.created` — New order placed
- `order.status_changed` — Order status updated
- `currency.distributed` — Currency distributed to users
- `user.created` — New user registered / invited
- `item.created` — New item added to catalog
- `item.stock_low` — Item stock falls below configurable threshold

---

## UI / UX Specifications

### Design System

Use the brand system established in the SwagVault brand concept:

- **Colors**: Deep navy (`#0a0e1a`), gold accents (`#c9a84c`), clean whites — but soften for the actual app UI. The dashboard should use a light/dark mode toggle with a neutral base (slate grays) and gold as the accent.
- **Typography**: Use `DM Sans` for the application UI. `Playfair Display` reserved for marketing pages only.
- **Radius**: 8px for small elements (buttons, inputs), 12px for cards, 16px for modals.
- **Shadows**: Minimal. Use border + subtle background shifts for elevation, not heavy drop shadows.

### Auth Pages

**Login (`/login`)**
- The login page dynamically renders based on which auth providers are active:
  - **Credentials only** (default): Email + password form.
  - **Credentials + Microsoft SSO**: Email/password form with a divider and "Sign in with Microsoft" button below.
  - **Credentials + LDAP**: Username + password form (label changes from "Email" to "Username" when LDAP is active). A toggle or note clarifying "Sign in with your network credentials."
  - **All three active**: Username/password form + Microsoft SSO button + divider. Username field accepts both email (credentials) and AD username (LDAP) — the backend tries credentials first, then LDAP.
- Error states: invalid credentials, account disabled, SSO callback error, LDAP server unreachable.
- "Forgot Password" link only shown for credential-based accounts (not SSO/LDAP).

**Admin → Settings → Authentication (`/admin/settings/auth`)**
- Overview page showing all auth methods with active/inactive status toggles.
- **Microsoft SSO config page**: Form for Tenant ID, Client ID, Client Secret (masked input). Shows the generated Redirect URI for copy. Test button that initiates an OAuth flow to validate the config. Toggle for auto-provisioning and default role select.
- **LDAP config page**: Form for all connection fields (server URL, bind DN, bind password, search base, filter, attribute mappings). TLS options (LDAPS vs STARTTLS, allow untrusted certs toggle). "Test Connection" button that attempts a bind + sample user search and shows results. Toggle for auto-provisioning and default role select.
- **Group Mapping** (shared UI for both SSO and LDAP): Table mapping external group names to SwagVault roles. Add/remove rows.

### Store Pages (The Vault)

**Catalog Browse (`/`)**
- Grid layout (3-4 columns desktop, 2 mobile)
- Each card: item image, name, price in currency, stock indicator
- Category filter sidebar (collapsible on mobile)
- Search bar with instant filter
- User balance always visible in header (the "Vault Balance" pill)

**Item Detail (`/item/[slug]`)**
- Large image (support multiple images with gallery)
- Name, description (rendered markdown), price, stock status
- "Claim from Vault" button (disabled if insufficient balance, out of stock, or already in cart)
- Related items section

**Cart (`/cart`)**
- Line items with quantity, individual price, subtotal
- Total cost vs. current balance comparison
- Clear visual indicator if balance is insufficient
- "Claim" button to submit order

**Orders (`/orders`)**
- List of past orders with status badges
- Click into order for detail (items, amounts, timestamps)

### Admin Dashboard

**Overview (`/admin/dashboard`)**
- Stat cards: Total users, Total currency in circulation, Active items, Pending orders
- Recent activity feed (last 10 transactions + orders)
- Quick actions: Distribute currency, Add item

**Catalog Management (`/admin/catalog`)**
- Data table with inline status toggle (active/inactive)
- Bulk actions (activate, deactivate, delete)
- Image upload with drag-and-drop
- Markdown editor for descriptions

**User Management (`/admin/users`)**
- Data table: name, email, role, balance, status, joined date
- Click into user for full detail: balance history chart, order history, role management
- Bulk distribute action (select multiple users → enter amount → confirm)
- Invite flow: enter email → sends invite link

**Currency / Ledger (`/admin/currency`)**
- Distribute form: select users (search/filter), enter amount, enter reason
- Full ledger table: timestamp, user, type, amount, balance after, reason, performed by
- Export to CSV

**Order Management (`/admin/orders`)**
- Kanban-style or table view grouped by status
- Click into order: user info, items, timeline, status update buttons
- Fulfillment notes field

---

## First-Run Setup Flow

When the application boots for the first time (no `instance_settings` row exists or `setup_complete = false`), redirect all routes to the setup wizard:

1. **Welcome** — "Welcome to SwagVault. Let's set up your Vault."
2. **Organization** — Org name, upload logo, primary brand color
3. **Currency** — Name your currency, pick a symbol/icon
4. **Admin Account** — Create the first admin user (email + password)
5. **Done** — "Your Vault is ready. Open the Vault." → Redirect to admin dashboard

---

## Docker Deployment (Self-Hosted)

### `docker-compose.yml`

```yaml
services:
  swagvault:
    image: swagvault/swagvault:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://swagvault:${DB_PASSWORD}@db:5432/swagvault
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${BASE_URL:-http://localhost:3000}
      AUTH_ENCRYPTION_KEY: ${AUTH_ENCRYPTION_KEY}
      STORAGE_TYPE: local
      STORAGE_PATH: /data/uploads
    volumes:
      - swagvault_uploads:/data/uploads
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: swagvault
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: swagvault
    volumes:
      - swagvault_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-LINE", "pg_isready -U swagvault"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  swagvault_db:
  swagvault_uploads:
```

> **LDAP / Active Directory Note:** When deployed via Docker on a corporate network, the SwagVault container must have network access to the organization's Active Directory domain controller(s). If using `docker compose`, the default bridge network may not have access to the host network where AD lives. Options:
> - Use `network_mode: host` on the swagvault service (simplest, Linux only)
> - Use a macvlan or ipvlan Docker network that places the container on the corporate LAN
> - Ensure the Docker bridge network can route to the AD server IPs
> - Document this clearly in the self-hosted setup guide with a troubleshooting section

### `Dockerfile`

Multi-stage build: install → build → production (standalone Next.js output for minimal image size). Target image size < 200MB. Base image must be **Node.js 20.9.0+** (Next.js 16 minimum requirement). Use `node:20-alpine` or `node:22-alpine`.

### Deployment goal

A self-hosted user should be able to run:

```bash
curl -sSL https://getswagvault.com/install.sh | bash
```

Which downloads the compose file, generates secrets, and runs `docker compose up -d`. Total time to running instance: < 2 minutes.

---

## Environment Variables

```env
# Required
DATABASE_URL=postgres://user:pass@localhost:5432/swagvault
NEXTAUTH_SECRET=<random-32-char-string>
NEXTAUTH_URL=http://localhost:3000

# Storage (default: local)
STORAGE_TYPE=local          # "local" or "s3"
STORAGE_PATH=/data/uploads  # For local storage
S3_BUCKET=                  # For S3 storage
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_ENDPOINT=                # For S3-compatible (MinIO, etc.)

# Email (optional — features degrade gracefully without it)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@yourorg.com

# Optional
LOG_LEVEL=info
MAX_UPLOAD_SIZE=10485760    # 10MB default

# Auth Encryption (required if using SSO or LDAP)
AUTH_ENCRYPTION_KEY=<random-32-byte-hex-string>  # Used to encrypt provider secrets at rest
```

---

## Development Phases

### Phase 1 — Foundation (MVP Core)
**Goal: A working store that one admin can set up, stock, distribute currency, and users can browse and claim items.**

1. Project scaffolding: Next.js 16 + TypeScript + Tailwind + Drizzle + PostgreSQL (use `npx create-next-app@latest`, confirm Turbopack default)
2. Database schema + initial migration
3. Auth system (Auth.js v5 credentials provider, session management)
4. Route protection via `proxy.ts` (admin routes, auth redirects)
5. First-run setup wizard
6. Instance settings CRUD
7. Currency engine (credit, debit with transaction logging)
8. Item CRUD (admin) + catalog browse (store) — use `"use cache"` on catalog page
9. Image upload (local storage adapter)
9. Cart + order placement flow
10. Order management (admin status updates, cancellation with refund)
11. User management (invite, role assignment, balance view)
12. Currency distribution (single + bulk)
13. Transaction ledger (admin view)
14. Auth provider settings UI (admin)
15. Microsoft Entra ID SSO provider (hosted offering)
16. LDAP / Active Directory provider (self-hosted Docker)
17. Auth provider test connection flow (LDAP) and redirect URI display (SSO)
18. Auto-provisioning + group-to-role mapping for both external providers
19. Basic responsive UI for all pages
20. Docker build + compose file

### Phase 2 — Polish & Power Features
**Goal: Production-ready for real teams. Feels like a real product.**

1. Search + category filtering on catalog
2. Admin dashboard with stats + activity feed
3. User profile page with balance history
4. Dark/light mode toggle
5. Enable React Compiler (`reactCompiler: true` in `next.config.ts`) and measure performance
6. View Transitions for page navigation animations (store browsing, admin tab switches)
7. Image gallery on item detail pages
8. Markdown rendering for item descriptions
9. CSV export for ledger and user data
10. Email notifications (invites, order confirmations, status updates)
11. Pagination + sorting on all data tables
12. Empty states and loading skeletons throughout
13. Error boundaries + toast notifications
14. Fine-tune caching strategy: add `"use cache"` + `cacheLife()` / `cacheTag()` to appropriate pages
15. `install.sh` script for one-line self-hosted deploy
16. README + basic documentation

### Phase 3 — Integrations & SaaS
**Goal: API ecosystem and hosted offering.**

1. REST API (v1) with API key auth
2. Webhook system (event dispatch, HMAC signing, retry logic)
3. S3 storage adapter
4. Multi-tenant architecture for hosted offering (subdomain-based routing)
5. Subscription billing integration (Stripe) for hosted plans
6. Custom subdomain provisioning
7. Rate limiting on API endpoints
8. Audit log for admin actions
9. Hosted onboarding flow (separate from self-hosted setup)

### Phase 4 — Growth & Ecosystem
**Goal: Integrations that drive adoption.**

1. Slack integration (slash command to check balance, notifications for drops)
2. Microsoft Teams integration
3. Zapier / n8n webhook templates
4. SSO enhancements: additional providers (Google Workspace, Okta SAML) for enterprise hosted plans
5. Advanced analytics dashboard (trends, top items, engagement metrics)
6. Theming system (let orgs customize beyond just color + logo)
7. Public-facing API documentation (OpenAPI spec + hosted docs)

---

## Testing Strategy

- **Unit tests**: Currency engine, validators, utility functions. Use Vitest.
- **Integration tests**: API routes with a test database. Use Vitest + test containers.
- **E2E tests**: Critical flows (setup → distribute → browse → order → fulfill). Use Playwright.
- **CI**: GitHub Actions — lint, type-check, unit tests, integration tests on every PR. E2E on main branch.

---

## Implementation Notes for Claude Code

When implementing this project, follow these principles:

1. **Start with Phase 1 only.** Do not scaffold Phase 2-4 code. Build what's needed now.
2. **Database first.** Get the schema, migrations, and currency engine solid before touching UI.
3. **Currency operations are sacred.** Every balance change goes through the currency engine. No direct `UPDATE users SET balance` anywhere else in the codebase. All operations use database transactions with row-level locking.
4. **Server components by default.** Only use client components (`"use client"`) when you need interactivity (forms, modals, cart state). Data fetching happens in server components. Remember: all params/searchParams are async in Next.js 16 — always `await` them.
5. **Validate everything.** Use Zod schemas for all API inputs and form submissions. Shared schemas between client and server.
6. **No premature abstraction.** Don't build "just in case" features. If something isn't in the current phase, it doesn't exist yet.
7. **Mobile-first responsive.** All UI should work on mobile from the start, not bolted on later.
8. **Accessible by default.** Semantic HTML, proper ARIA labels, keyboard navigation on interactive elements.
9. **Error handling matters.** Every API route should have proper try/catch with meaningful error responses. Every UI action should have loading, success, and error states.
10. **Keep the vault metaphor.** Use the UX language from the brand guide: "Vault Balance", "Claim", "Vault Ledger", "Credits", etc. This is a product detail that makes it feel cohesive.
11. **Use `proxy.ts`, not `middleware.ts`.** Next.js 16 renames middleware to proxy. Use it for auth route protection. It runs on Node.js runtime only.
12. **Opt-in caching only.** Next.js 16 does not cache by default. Use `"use cache"` directive with `cacheLife()` and `cacheTag()` explicitly on pages/components that benefit from caching (catalog, categories, public settings). Do not cache user-specific pages.
13. **Do not enable React Compiler in Phase 1.** It's stable but opt-in. Add it in Phase 2 after the app is functional and you can measure the performance impact.
14. **Turbopack is default.** Do not add `--turbopack` flags to scripts. Do not add custom webpack config. If something doesn't work with Turbopack, flag it as a known issue.
