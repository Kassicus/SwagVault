import { requireAdmin } from '@/lib/auth/session';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Welcome to {ctx.organization.name}. KPIs land in Phase 5 — for now this
        page just confirms admin auth + subscription gating are working.
      </p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Stat label="Subscription" value={ctx.organization.subscription_status} />
        <Stat label="Fulfillment" value={ctx.organization.fulfillment_mode} />
      </dl>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-medium">{value}</div>
    </div>
  );
}
