-- ============================================================================
-- 0001_init.sql — Phase 1 schema: auth, orgs, billing
--
-- Scope: organizations, organization_currencies, memberships, invites,
-- subscription_events, helpers, and the setup_organization RPC used by signup.
-- Products / orders / transactions / place_order land in a later migration
-- (Phase 3+).
--
-- This file is safe to re-run on a partial-init database; the prelude drops
-- any partial state before recreating it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- Idempotent reset of objects we own (in dependency order, leaf first).
-- Safe on a clean DB because of "if exists". Tables intentionally NOT dropped
-- so we don't lose data on accidental re-runs once we have rows.
-- ---------------------------------------------------------------------------
drop function if exists setup_organization(uuid, text, text);
drop function if exists auth_user_admin_organizations();
drop function if exists auth_user_organizations();
drop function if exists is_reserved_slug(text);
drop function if exists set_updated_at();
drop type if exists member_role;
drop type if exists subscription_plan;
drop type if exists subscription_status;
drop type if exists fulfillment_mode;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type fulfillment_mode as enum ('shipping', 'pickup', 'both');
create type subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
);
create type subscription_plan as enum ('monthly', 'annual');
create type member_role as enum ('owner', 'admin', 'member');

-- ---------------------------------------------------------------------------
-- Stateless helpers (no table refs — safe to declare before tables exist)
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Reserved slugs are paths reserved by the marketing/app surfaces. Slugs are
-- checked against this list at insert time via a CHECK constraint.
create or replace function is_reserved_slug(s text) returns boolean
  language sql immutable as $$
  select lower(s) = any (array[
    'admin','api','app','auth','billing','blog','contact','dashboard','docs',
    'help','login','logout','marketing','pricing','public','settings','signup',
    'static','status','support','terms','privacy','www','assets','_next','next',
    'cdn','health','about','accept-invite','leaderboard','store','cart','orders',
    'account','members','products','currency'
  ]);
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  fulfillment_mode fulfillment_mode not null default 'pickup',
  pickup_location text,
  leaderboard_enabled boolean not null default false,
  stripe_customer_id text unique,
  subscription_status subscription_status not null default 'incomplete',
  subscription_plan subscription_plan,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slug_not_reserved check (not is_reserved_slug(slug)),
  constraint slug_format check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$')
);

drop trigger if exists trg_orgs_updated_at on organizations;
create trigger trg_orgs_updated_at before update on organizations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_currencies (1:1 with organizations)
-- ---------------------------------------------------------------------------
create table if not exists organization_currencies (
  organization_id uuid primary key references organizations(id) on delete cascade,
  name text not null default 'Points',
  symbol text not null default '★',
  icon_url text,
  color_hex text not null default '#6366f1',
  decimal_places smallint not null default 0
    check (decimal_places between 0 and 4),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_org_currencies_updated_at on organization_currencies;
create trigger trg_org_currencies_updated_at before update on organization_currencies
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- memberships
-- ---------------------------------------------------------------------------
create table if not exists memberships (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'member',
  balance_minor_units bigint not null default 0,
  leaderboard_visible boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists memberships_user_id_idx on memberships(user_id);

-- ---------------------------------------------------------------------------
-- invites
-- ---------------------------------------------------------------------------
create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email citext not null,
  role member_role not null default 'member',
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists invites_organization_id_idx on invites(organization_id);
create index if not exists invites_email_idx on invites(email);

-- ---------------------------------------------------------------------------
-- subscription_events (Stripe webhook idempotency + audit trail)
-- ---------------------------------------------------------------------------
create table if not exists subscription_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  stripe_event_id text not null unique,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create index if not exists subscription_events_org_idx on subscription_events(organization_id);

-- ---------------------------------------------------------------------------
-- Table-aware helpers — must come AFTER memberships exists because Postgres
-- validates SQL function bodies at creation time.
--
-- Wrapped in security definer so RLS policies on memberships itself can use
-- them without recursing.
-- ---------------------------------------------------------------------------
create or replace function auth_user_organizations() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select organization_id from memberships where user_id = auth.uid()
$$;

create or replace function auth_user_admin_organizations() returns setof uuid
  language sql stable security definer set search_path = public, pg_temp as $$
  select organization_id from memberships
  where user_id = auth.uid() and role in ('owner', 'admin')
$$;

-- ---------------------------------------------------------------------------
-- RLS + policies
-- ---------------------------------------------------------------------------
alter table organizations enable row level security;
drop policy if exists "orgs: members read own" on organizations;
create policy "orgs: members read own"
  on organizations for select
  using (id in (select auth_user_organizations()));

drop policy if exists "orgs: admins update own" on organizations;
create policy "orgs: admins update own"
  on organizations for update
  using (id in (select auth_user_admin_organizations()))
  with check (id in (select auth_user_admin_organizations()));

-- Inserts and deletes only happen via service-role server code (signup flow).

alter table organization_currencies enable row level security;
drop policy if exists "currencies: members read" on organization_currencies;
create policy "currencies: members read"
  on organization_currencies for select
  using (organization_id in (select auth_user_organizations()));

drop policy if exists "currencies: admins update" on organization_currencies;
create policy "currencies: admins update"
  on organization_currencies for update
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));

alter table memberships enable row level security;
drop policy if exists "memberships: read own" on memberships;
create policy "memberships: read own"
  on memberships for select
  using (user_id = auth.uid());

drop policy if exists "memberships: admins read org" on memberships;
create policy "memberships: admins read org"
  on memberships for select
  using (organization_id in (select auth_user_admin_organizations()));

drop policy if exists "memberships: update self" on memberships;
create policy "memberships: update self"
  on memberships for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "memberships: admins update org" on memberships;
create policy "memberships: admins update org"
  on memberships for update
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));

alter table invites enable row level security;
drop policy if exists "invites: admins manage" on invites;
create policy "invites: admins manage"
  on invites for all
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));

alter table subscription_events enable row level security;
drop policy if exists "sub_events: admins read" on subscription_events;
create policy "sub_events: admins read"
  on subscription_events for select
  using (organization_id in (select auth_user_admin_organizations()));
-- Writes happen via service-role (webhook handler); no insert/update policies.

-- ---------------------------------------------------------------------------
-- setup_organization RPC
-- Atomically creates an organization + default currency + owner membership.
-- Called from the signup Server Action with the service-role client.
-- ---------------------------------------------------------------------------
create or replace function setup_organization(
  p_user_id uuid,
  p_slug text,
  p_name text
) returns uuid
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_org_id uuid;
begin
  insert into organizations (slug, name)
  values (p_slug, p_name)
  returning id into v_org_id;

  insert into organization_currencies (organization_id) values (v_org_id);

  insert into memberships (organization_id, user_id, role)
  values (v_org_id, p_user_id, 'owner');

  return v_org_id;
end;
$$;

revoke all on function setup_organization(uuid, text, text)
  from public, anon, authenticated;
grant execute on function setup_organization(uuid, text, text)
  to service_role;
