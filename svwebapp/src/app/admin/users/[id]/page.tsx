import { eq, and, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { withTenant } from "@/lib/db/tenant";
import {
  users,
  organizationMembers,
  balances,
  transactions,
} from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { UserRoleSelect } from "@/components/admin/user-role-select";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAuth();
  const org = await getResolvedTenant();

  const data = await withTenant(org.id, async (tx) => {
    const [member] = await tx
      .select({
        memberId: organizationMembers.id,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
        joinedAt: organizationMembers.joinedAt,
        balance: balances.balance,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(balances, eq(balances.userId, users.id))
      .where(
        and(
          eq(organizationMembers.tenantId, org.id),
          eq(users.id, id)
        )
      );

    if (!member) return null;

    const recentTx = await tx
      .select()
      .from(transactions)
      .where(
        and(eq(transactions.tenantId, org.id), eq(transactions.userId, id))
      )
      .orderBy(desc(transactions.createdAt))
      .limit(10);

    return { member, recentTx };
  });

  if (!data) notFound();

  const { member, recentTx } = data;
  const sym = org.currencySymbol ?? "C";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{member.displayName}</h1>
        <p className="text-sm text-muted-foreground">{member.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(member.balance ?? 0, sym)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Role</p>
            <UserRoleSelect
              memberId={member.memberId}
              currentRole={member.role}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={member.isActive ? "success" : "destructive"} className="mt-1">
              {member.isActive ? "Active" : "Inactive"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions</p>
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
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
