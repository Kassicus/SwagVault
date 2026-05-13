-- ============================================================================
-- 0004_orders.sql — Phase 4: cart checkout, balance ledger
--
-- Scope: orders, order_items, transactions, balance maintenance trigger, and
-- the place_order RPC that atomically locks variants + the buyer's membership,
-- validates inventory + balance, and writes the order + items + spend
-- transaction in one transaction.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('pending', 'fulfilled', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'fulfillment_method') then
    create type fulfillment_method as enum ('shipping', 'pickup');
  end if;
  if not exists (select 1 from pg_type where typname = 'transaction_kind') then
    create type transaction_kind as enum ('grant', 'spend', 'refund', 'adjustment');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status order_status not null default 'pending',
  fulfillment_method fulfillment_method not null,
  shipping_address jsonb,
  total_minor_units bigint not null check (total_minor_units >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipping_address_required check (
    (fulfillment_method = 'shipping' and shipping_address is not null)
    or (fulfillment_method = 'pickup' and shipping_address is null)
  )
);

create index if not exists orders_organization_id_idx on orders(organization_id);
create index if not exists orders_user_id_idx on orders(user_id);
create index if not exists orders_status_idx on orders(organization_id, status);
create index if not exists orders_created_at_idx on orders(organization_id, created_at desc);

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- order_items (price + product/variant names snapshotted at order time)
-- ---------------------------------------------------------------------------
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  qty integer not null check (qty > 0),
  unit_price_minor_units bigint not null check (unit_price_minor_units >= 0),
  product_name text not null,
  variant_name text
);

create index if not exists order_items_order_id_idx on order_items(order_id);

-- ---------------------------------------------------------------------------
-- transactions (signed ledger; balance is derived but cached on memberships)
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind transaction_kind not null,
  -- Signed: grant/refund > 0, spend < 0, adjustment either.
  amount_minor_units bigint not null,
  order_id uuid references orders(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_org_idx
  on transactions(organization_id, user_id, created_at desc);
create index if not exists transactions_order_id_idx on transactions(order_id);

-- ---------------------------------------------------------------------------
-- Balance maintenance trigger.
-- balance_minor_units on memberships is a denormalized cache of
-- sum(amount_minor_units) for (org, user). Every insert into transactions
-- bumps it by the (signed) amount.
-- ---------------------------------------------------------------------------
create or replace function apply_transaction_to_balance() returns trigger
  language plpgsql as $$
begin
  update memberships
  set balance_minor_units = balance_minor_units + new.amount_minor_units
  where organization_id = new.organization_id and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists trg_transactions_balance on transactions;
create trigger trg_transactions_balance
  after insert on transactions
  for each row execute function apply_transaction_to_balance();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table orders enable row level security;

drop policy if exists "orders: user reads own" on orders;
create policy "orders: user reads own"
  on orders for select
  using (user_id = auth.uid());

drop policy if exists "orders: admins read org" on orders;
create policy "orders: admins read org"
  on orders for select
  using (organization_id in (select auth_user_admin_organizations()));

drop policy if exists "orders: admins update org" on orders;
create policy "orders: admins update org"
  on orders for update
  using (organization_id in (select auth_user_admin_organizations()))
  with check (organization_id in (select auth_user_admin_organizations()));

-- Inserts happen via service-role through place_order RPC.

alter table order_items enable row level security;

drop policy if exists "order_items: read via order" on order_items;
create policy "order_items: read via order"
  on order_items for select
  using (
    order_id in (
      select id from orders
      where user_id = auth.uid()
         or organization_id in (select auth_user_admin_organizations())
    )
  );

alter table transactions enable row level security;

drop policy if exists "transactions: user reads own" on transactions;
create policy "transactions: user reads own"
  on transactions for select
  using (user_id = auth.uid());

drop policy if exists "transactions: admins read org" on transactions;
create policy "transactions: admins read org"
  on transactions for select
  using (organization_id in (select auth_user_admin_organizations()));

-- ---------------------------------------------------------------------------
-- place_order RPC
--
-- Locking strategy: variant rows are locked first (in id order), then the
-- buyer's membership row. Always-same lock order prevents deadlocks between
-- concurrent place_order calls.
--
-- Failure cases are signalled via prefixed error messages so the Server Action
-- can parse and surface them:
--   - INSUFFICIENT_BALANCE
--   - OUT_OF_STOCK:<product_name>:<variant_name>
--   - UNAVAILABLE:<product_name>:<variant_name>
-- ---------------------------------------------------------------------------
create or replace function place_order(
  p_organization_id uuid,
  p_user_id uuid,
  p_items jsonb,
  p_fulfillment fulfillment_method,
  p_shipping_address jsonb
) returns uuid
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order_id uuid;
  v_total bigint := 0;
  v_balance bigint;
  v_item record;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART';
  end if;

  -- 1. Lock variant rows in id order (deadlock-safe).
  perform 1
  from product_variants
  where id in (
    select (i->>'variant_id')::uuid from jsonb_array_elements(p_items) i
  )
    and organization_id = p_organization_id
  order by id
  for update;

  -- 2. Lock the buyer's membership row.
  select balance_minor_units
  into v_balance
  from memberships
  where organization_id = p_organization_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'NO_MEMBERSHIP';
  end if;

  -- 3. Validate each item + compute total.
  for v_item in
    select
      pv.id as variant_id,
      pv.product_id,
      pv.price_minor_units,
      pv.inventory_count,
      pv.active as variant_active,
      pv.name as variant_name,
      p.name as product_name,
      p.active as product_active,
      (i->>'qty')::int as qty
    from jsonb_array_elements(p_items) i
    join product_variants pv on pv.id = (i->>'variant_id')::uuid
    join products p on p.id = pv.product_id
    where pv.organization_id = p_organization_id
  loop
    if v_item.qty is null or v_item.qty <= 0 then
      raise exception 'INVALID_QTY:%:%', v_item.product_name, coalesce(v_item.variant_name, '');
    end if;
    if not v_item.product_active or not v_item.variant_active then
      raise exception 'UNAVAILABLE:%:%', v_item.product_name, coalesce(v_item.variant_name, '');
    end if;
    if v_item.inventory_count < v_item.qty then
      raise exception 'OUT_OF_STOCK:%:%', v_item.product_name, coalesce(v_item.variant_name, '');
    end if;
    v_total := v_total + (v_item.price_minor_units::bigint * v_item.qty::bigint);
  end loop;

  if v_balance < v_total then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  -- 4. Create the order.
  insert into orders (
    organization_id, user_id, fulfillment_method, shipping_address, total_minor_units
  )
  values (
    p_organization_id, p_user_id, p_fulfillment, p_shipping_address, v_total
  )
  returning id into v_order_id;

  -- 5. Insert order items + decrement inventory in one statement each.
  insert into order_items (
    order_id, product_id, variant_id, qty, unit_price_minor_units, product_name, variant_name
  )
  select
    v_order_id,
    pv.product_id,
    pv.id,
    (i->>'qty')::int,
    pv.price_minor_units,
    p.name,
    pv.name
  from jsonb_array_elements(p_items) i
  join product_variants pv on pv.id = (i->>'variant_id')::uuid
  join products p on p.id = pv.product_id
  where pv.organization_id = p_organization_id;

  update product_variants pv
  set inventory_count = pv.inventory_count - (i->>'qty')::int
  from jsonb_array_elements(p_items) i
  where pv.id = (i->>'variant_id')::uuid
    and pv.organization_id = p_organization_id;

  -- 6. Spend transaction (trigger updates memberships.balance_minor_units).
  insert into transactions (
    organization_id, user_id, kind, amount_minor_units, order_id, note
  )
  values (
    p_organization_id, p_user_id, 'spend', -v_total, v_order_id, 'Order placed'
  );

  return v_order_id;
end;
$$;

revoke all on function place_order(uuid, uuid, jsonb, fulfillment_method, jsonb)
  from public, anon, authenticated;
grant execute on function place_order(uuid, uuid, jsonb, fulfillment_method, jsonb)
  to service_role;
