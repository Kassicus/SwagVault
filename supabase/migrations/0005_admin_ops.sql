-- ============================================================================
-- 0005_admin_ops.sql — Phase 5: admin order operations
--
-- Adds the cancel_order RPC. Cancelling an order is symmetric to placing
-- one: restore inventory, write a refund transaction (positive amount; the
-- existing balance trigger updates memberships.balance_minor_units), and
-- set the order status to 'cancelled'. All in one transaction.
-- ============================================================================

create or replace function cancel_order(
  p_order_id uuid,
  p_actor_user_id uuid
) returns void
  language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order record;
  v_item record;
begin
  -- Lock the order row first so concurrent cancels serialise.
  select * into v_order
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'ALREADY_CANCELLED';
  end if;

  -- Restore inventory for any line items whose variant still exists.
  -- (order_items.variant_id is ON DELETE SET NULL, so a deleted variant
  -- means we can't restore inventory — silently skip those lines.)
  for v_item in
    select variant_id, qty
    from order_items
    where order_id = p_order_id
      and variant_id is not null
  loop
    update product_variants
    set inventory_count = inventory_count + v_item.qty
    where id = v_item.variant_id;
  end loop;

  -- Refund the buyer (signed positive; the after-insert trigger on
  -- transactions adjusts memberships.balance_minor_units).
  insert into transactions (
    organization_id, user_id, kind, amount_minor_units,
    order_id, actor_user_id, note
  )
  values (
    v_order.organization_id, v_order.user_id, 'refund',
    v_order.total_minor_units, p_order_id, p_actor_user_id,
    'Order cancelled'
  );

  update orders set status = 'cancelled' where id = p_order_id;
end;
$$;

revoke all on function cancel_order(uuid, uuid)
  from public, anon, authenticated;
grant execute on function cancel_order(uuid, uuid)
  to service_role;
