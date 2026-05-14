-- ============================================================================
-- 0006_audit.sql — Phase polish: comprehensive admin audit log
--
-- transactions remains the financial ledger (grants/spends/refunds). This new
-- audit_logs table captures non-financial admin events: invites, product CRUD,
-- order fulfillment, settings/currency changes, subscription state changes.
-- The audit-log admin page merges both into one timeline.
--
-- action is text (not an enum) so adding new event types in app code doesn't
-- require a migration. Conventional values are documented in lib/audit/log.ts.
-- ============================================================================

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  -- actor_user_id is null when the event is system-driven (e.g. webhook).
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_org_action_idx
  on audit_logs(organization_id, action);
create index if not exists audit_logs_actor_idx
  on audit_logs(organization_id, actor_user_id);

alter table audit_logs enable row level security;

drop policy if exists "audit_logs: admins read" on audit_logs;
create policy "audit_logs: admins read"
  on audit_logs for select
  using (organization_id in (select auth_user_admin_organizations()));

-- Writes happen via service-role (Server Actions); no insert/update policies.
