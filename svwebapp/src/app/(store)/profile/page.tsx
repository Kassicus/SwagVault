import { eq, and, desc, count } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { db } from "@/lib/db";
import { users, balances, transactions } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { getSignedUrl } from "@/lib/storage/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";
import { ProfileEditForm } from "./profile-edit-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);

  // Resolve avatar signed URL
  const [userRow] = await db
    .select({ avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, user.id));
  let currentAvatarUrl: string | null = null;
  if (userRow?.avatarUrl) {
    try { currentAvatarUrl = await getSignedUrl(userRow.avatarUrl); } catch {}
  }

  const { balance, recentTx, totalTx } = await withTenant(org.id, async (tx) => {
    const [bal] = await tx
      .select({ balance: balances.balance })
      .from(balances)
      .where(and(eq(balances.tenantId, org.id), eq(balances.userId, user.id)));

    const [txCount] = await tx
      .select({ count: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, org.id),
          eq(transactions.userId, user.id)
        )
      );

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
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return {
      balance: bal?.balance ?? 0,
      recentTx,
      totalTx: txCount?.count ?? 0,
    };
  });

  const sym = org.currencySymbol ?? "C";
  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">My Profile</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
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

      {/* Edit Profile */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm currentName={user.displayName} currentAvatarUrl={currentAvatarUrl} />
        </CardContent>
      </Card>

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
            <>
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
              <Pagination
                currentPage={page}
                totalPages={totalPages(totalTx, pageSize)}
                baseParams={baseParams}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
