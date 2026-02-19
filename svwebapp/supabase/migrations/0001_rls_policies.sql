-- ─── Tenant context function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION set_tenant(tid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tid::text, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION current_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_tenant')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ─── RLS on organization_members ─────────────────────────────────

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON organization_members
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on balances ─────────────────────────────────────────────

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON balances
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on categories ──────────────────────────────────────────

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on items ────────────────────────────────────────────────

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on orders ───────────────────────────────────────────────

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on order_items ──────────────────────────────────────────

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON order_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on transactions ─────────────────────────────────────────

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON transactions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on api_keys ─────────────────────────────────────────────

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON api_keys
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);

-- ─── RLS on webhook_endpoints ────────────────────────────────────

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON webhook_endpoints
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant')::uuid);
