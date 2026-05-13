import Image from 'next/image';
import { requireAdmin } from '@/lib/auth/session';
import { getOrgCurrency } from '@/lib/currency/server';
import { Money } from '@/lib/currency/money';

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireAdmin(orgSlug);
  const currency = await getOrgCurrency(ctx.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome to {ctx.organization.name}. KPIs land in Phase 5.
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <Stat label="Subscription" value={ctx.organization.subscription_status} />
        <Stat label="Fulfillment" value={ctx.organization.fulfillment_mode} />
        <CurrencyStat
          name={currency.name}
          symbol={currency.symbol}
          color={currency.color_hex}
          iconUrl={currency.icon_url}
          example={1234 * 10 ** currency.decimal_places + 56}
          currency={currency}
        />
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

function CurrencyStat({
  name,
  symbol,
  color,
  iconUrl,
  example,
  currency,
}: {
  name: string;
  symbol: string;
  color: string;
  iconUrl: string | null;
  example: number;
  currency: { name: string; symbol: string; decimal_places: number };
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Currency
      </div>
      <div className="mt-1 flex items-center gap-2">
        {iconUrl ? (
          <Image
            src={iconUrl}
            alt=""
            width={20}
            height={20}
            className="rounded"
          />
        ) : (
          <div
            className="grid h-5 w-5 place-items-center rounded text-xs font-medium text-white"
            style={{ backgroundColor: color }}
          >
            {symbol.slice(0, 1)}
          </div>
        )}
        <div className="text-lg font-medium">
          <Money amount={example} currency={currency} />
        </div>
        <span className="text-sm text-muted-foreground">{name}</span>
      </div>
    </div>
  );
}
