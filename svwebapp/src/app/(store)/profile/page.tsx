import { eq, and, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { balances, transactions } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function ProfilePage() {
  const user = await requireAuth();
  const org = await getResolvedTenant();

  const { balance, recentTx } = await withTenant(org.id, async (tx) => {
    const [bal] = await tx
      .select({ balance: balances.balance })
      .from(balances)
      .where(and(eq(balances.tenantId, org.id), eq(balances.userId, user.id)));

    const recentTx = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, org.id),
          eq(transactions.userId, user.id)
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    return { balance: bal?.balance ?? 0, recentTx };
  });

  const sym = org.currencySymbol ?? "C";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">My Profile</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Display Name</p>
            <p className="text-lg font-medium">{user.displayName}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Vault Balance</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(balance, sym)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet
            </p>
          ) : (
            <div className="divide-y divide-border">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{tx.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-medium ${
                        tx.type === "credit"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount, sym)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(tx.balanceAfter, sym)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
