import { requireAdmin } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { openCustomerPortalAction } from './actions';

export const metadata = { title: 'Billing · SwagVault' };

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscription for {ctx.organization.name}.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Status" value={ctx.organization.subscription_status} />
        <Stat
          label="Plan"
          value={
            ctx.organization.subscription_status === 'incomplete'
              ? '—'
              : 'see Stripe portal'
          }
        />
      </div>
      <form action={openCustomerPortalAction}>
        <input type="hidden" name="slug" value={orgSlug} />
        <Button type="submit">Manage subscription in Stripe</Button>
      </form>
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
