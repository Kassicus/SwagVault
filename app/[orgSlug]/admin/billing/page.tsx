import { requireAdmin } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { isBillingEnabled } from '@/lib/billing/flag';
import { openCustomerPortalAction } from './actions';

export const metadata = { title: 'Billing · SwagVault' };

export default async function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);

  if (!isBillingEnabled()) {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader />
        <div className="border-2 border-dashed border-foreground/40 p-6">
          <p className="font-heading text-lg font-bold uppercase">
            Billing not configured
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Once Stripe is wired up and{' '}
            <code className="border border-foreground bg-card px-1.5 py-0.5 font-mono text-xs">
              BILLING_ENABLED=true
            </code>{' '}
            is set, this page will manage the subscription for{' '}
            {ctx.organization.name}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader subtitle={`Subscription for ${ctx.organization.name}.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Status"
          value={ctx.organization.subscription_status}
          isStatus
        />
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
        <Button type="submit" size="lg">
          Manage subscription in Stripe →
        </Button>
      </form>
    </div>
  );
}

function PageHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <p className="label-mono text-muted-foreground">{'// Account'}</p>
      <h1 className="mt-2 font-heading text-4xl font-black uppercase tracking-tight">
        Billing
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  isStatus,
}: {
  label: string;
  value: string;
  isStatus?: boolean;
}) {
  const variant =
    value === 'active' || value === 'trialing'
      ? 'mint'
      : value === 'incomplete' || value === 'past_due'
        ? 'warn'
        : value === 'canceled'
          ? 'muted'
          : 'outline';
  return (
    <div className="border-2 border-foreground bg-card p-5">
      <p className="label-mono text-muted-foreground">{label}</p>
      {isStatus ? (
        <div className="mt-3">
          <Badge variant={variant}>{value}</Badge>
        </div>
      ) : (
        <p className="mt-2 font-heading text-lg font-bold">{value}</p>
      )}
    </div>
  );
}
