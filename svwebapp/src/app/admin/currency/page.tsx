import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { balances, transactions } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default async function CurrencyPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const stats = await withTenant(org.id, async (tx) => {
    const [totalBalance] = await tx
      .select({
        total: sql<number>`COALESCE(SUM(${balances.balance}), 0)`,
      })
      .from(balances)
      .where(eq(balances.tenantId, org.id));

    const [totalDistributed] = await tx
      .select({
        total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.tenantId, org.id));

    return {
      totalBalance: totalBalance?.total ?? 0,
      totalDistributed: totalDistributed?.total ?? 0,
    };
  });

  const sym = org.currencySymbol ?? "C";
  const currName = org.currencyName ?? "Credits";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Currency</h1>
          <p className="text-sm text-muted-foreground">
            Manage {currName} distribution
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/currency/distribute">
            <Button>Distribute {currName}</Button>
          </Link>
          <Link href="/admin/currency/ledger">
            <Button variant="outline">View Ledger</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Total {currName} in Circulation
            </p>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(stats.totalBalance, sym)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Total {currName} Ever Distributed
            </p>
            <p className="text-3xl font-bold">
              {formatCurrency(stats.totalDistributed, sym)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
