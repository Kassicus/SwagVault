import { eq, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { transactions, users } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default async function LedgerPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const allTransactions = await withTenant(org.id, async (tx) => {
    return tx
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        balanceAfter: transactions.balanceAfter,
        reason: transactions.reason,
        referenceType: transactions.referenceType,
        createdAt: transactions.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.tenantId, org.id))
      .orderBy(desc(transactions.createdAt))
      .limit(100);
  });

  const sym = org.currencySymbol ?? "C";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Vault Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Complete transaction history
        </p>
      </div>

      {allTransactions.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
          No transactions yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Amount
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody>
              {allTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{tx.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.userEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        tx.type === "credit"
                          ? "success"
                          : tx.type === "debit"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {tx.type}
                    </Badge>
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      tx.type === "credit"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {formatCurrency(tx.amount, sym)}
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(tx.balanceAfter, sym)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {tx.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
