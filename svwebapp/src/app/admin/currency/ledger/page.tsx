import { eq, desc, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { transactions, users } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);

  const { data: allTransactions, total } = await withTenant(org.id, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.tenantId, org.id));

    const data = await tx
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        balanceAfter: transactions.balanceAfter,
        reason: transactions.reason,
        createdAt: transactions.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .where(eq(transactions.tenantId, org.id))
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { data, total: countResult?.count ?? 0 };
  });

  const sym = org.currencySymbol ?? "C";
  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;
  const exportUrl = `/api/export?type=ledger${tenant ? `&tenant=${tenant}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vault Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Complete transaction history ({total} total)
          </p>
        </div>
        <a href={exportUrl}>
          <Button variant="outline" size="sm">Export CSV</Button>
        </a>
      </div>

      <DataTable
        columns={[
          {
            header: "Date",
            cell: (row) => (
              <span className="text-muted-foreground">
                {new Date(row.createdAt as unknown as string).toLocaleDateString()}
              </span>
            ),
          },
          {
            header: "User",
            cell: (row) => (
              <div>
                <p className="font-medium">{row.userName as string}</p>
                <p className="text-xs text-muted-foreground">{row.userEmail as string}</p>
              </div>
            ),
          },
          {
            header: "Type",
            cell: (row) => (
              <Badge
                variant={
                  row.type === "credit" ? "success" : row.type === "debit" ? "destructive" : "secondary"
                }
              >
                {row.type as string}
              </Badge>
            ),
          },
          {
            header: "Amount",
            cell: (row) => (
              <span className={`font-medium ${row.type === "credit" ? "text-success" : "text-destructive"}`}>
                {row.type === "credit" ? "+" : "-"}
                {formatCurrency(row.amount as number, sym)}
              </span>
            ),
          },
          {
            header: "Balance After",
            cell: (row) => formatCurrency(row.balanceAfter as number, sym),
          },
          {
            header: "Reason",
            cell: (row) => <span className="text-muted-foreground">{row.reason as string}</span>,
          },
        ]}
        data={allTransactions}
        emptyMessage="No transactions yet"
        currentPage={page}
        totalPages={totalPages(total, pageSize)}
        baseParams={baseParams}
      />
    </div>
  );
}
