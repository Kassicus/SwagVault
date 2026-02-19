import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { getPlanLimits, getPlanDisplayName } from "@/lib/stripe/plans";
import { getPlanUsage } from "@/lib/stripe/enforce";
import { getInvoices } from "@/lib/stripe/client";
import { config } from "@/lib/config";
import { createCheckout, openBillingPortal } from "./actions";

export default async function BillingPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const plan = org.plan ?? "pro";
  const limits = getPlanLimits(plan);
  const usage = await getPlanUsage(org.id);

  const isTrialing =
    org.trialEndsAt && new Date(org.trialEndsAt) > new Date();
  const trialDaysLeft = isTrialing
    ? Math.ceil(
        (new Date(org.trialEndsAt!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  let invoices: { id: string; amount_due: number; status: string | null; created: number }[] = [];
  if (org.stripeCustomerId) {
    try {
      const result = await getInvoices(org.stripeCustomerId, 5);
      invoices = result.data.map((inv) => ({
        id: inv.id,
        amount_due: inv.amount_due,
        status: inv.status,
        created: inv.created,
      }));
    } catch {
      // Stripe unavailable — show page without invoices
    }
  }

  const proPriceId = config.stripe.proPriceId();
  const enterprisePriceId = config.stripe.enterprisePriceId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      {/* Plan overview */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {getPlanDisplayName(plan)} Plan
            </h2>
            {isTrialing && (
              <p className="mt-1 text-sm text-warning">
                Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}{" "}
                remaining
              </p>
            )}
            {org.stripeSubscriptionStatus && (
              <p className="mt-1 text-sm text-muted-foreground">
                Status:{" "}
                <span className="capitalize">
                  {org.stripeSubscriptionStatus}
                </span>
              </p>
            )}
          </div>
          {org.stripeCustomerId && (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Manage Subscription
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Usage meters */}
      <div className="grid gap-4 sm:grid-cols-2">
        <UsageMeter
          label="Members"
          current={usage.members}
          limit={limits.maxMembers}
        />
        <UsageMeter
          label="Catalog Items"
          current={usage.items}
          limit={limits.maxItems}
        />
      </div>

      {/* Upgrade options */}
      {plan !== "enterprise" && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Upgrade</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Unlock unlimited members, items, SSO, and API access.
          </p>
          <form action={createCheckout.bind(null, enterprisePriceId)} className="mt-4">
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Upgrade to Enterprise
            </button>
          </form>
        </div>
      )}

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Invoices</h2>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between border-b border-border py-2 last:border-0"
              >
                <div className="text-sm">
                  {new Date(inv.created * 1000).toLocaleDateString()}
                </div>
                <div className="text-sm font-medium">
                  ${(inv.amount_due / 100).toFixed(2)}
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                  {inv.status ?? "unknown"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsageMeter({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number | null;
}) {
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = limit ? current >= limit * 0.8 : false;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current} / {limit ?? "Unlimited"}
        </span>
      </div>
      {limit && (
        <div className="mt-2 h-2 rounded-full bg-muted">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? "bg-warning" : "bg-primary"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
