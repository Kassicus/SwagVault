-- ============================================================================
-- 0003_products.sql — Phase 3: product catalog
--
-- Scope: products + product_variants tables. The "always-one-variant" model
-- means inventory + price live exclusively on the variant row. A product with
-- no real variants (e.g. a desk pad) still has one underlying variant named
-- 'default' with options={}; the admin UI hides variant management when only
-- the default variant exists.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  image_paths text[] not null default '{}',
  tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_organization_id_idx on products(organization_id);
create index if not exists products_active_idx on products(organization_id, active);
create index if not exists products_tags_gin_idx on products using gin(tags);

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at before update on products
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  -- Denormalized for RLS performance: every variant query filters by org first.
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  price_minor_units bigint not null default 0,
  inventory_count integer not null default 0 check (inventory_count >= 0),
  position smallint not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on product_variants(product_id);
create index if not exists product_variants_organization_id_idx on product_variants(organization_id);
create unique index if not exists product_variants_name_per_product_uniq
  on product_variants(product_id, name);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table products enable row level security;

drop policy if exists "products: members read active" on products;
create policy "products: members read active"
  on products for select
  using (
    active
    and organization_id in (select auth_user_organizations())
  );

drop policy if exists "products: admins read all" on products;
create policy "products: admins read all"
  on products for select
  using (organization_id in (select auth_user_admin_organizations()));

drop policy if exists "products: admins manage" on products;
create policy "products: admins manage"
  on products for all
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));

alter table product_variants enable row level security;

drop policy if exists "variants: members read active" on product_variants;
create policy "variants: members read active"
  on product_variants for select
  using (
    active
    and organization_id in (select auth_user_organizations())
  );

drop policy if exists "variants: admins read all" on product_variants;
create policy "variants: admins read all"
  on product_variants for select
  using (organization_id in (select auth_user_admin_organizations()));

drop policy if exists "variants: admins manage" on product_variants;
create policy "variants: admins manage"
  on product_variants for all
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));
