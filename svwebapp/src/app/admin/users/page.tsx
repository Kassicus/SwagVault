import { eq } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users, balances } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireAuth();
  const org = await getResolvedTenant();

  const members = await withTenant(org.id, async (tx) => {
    return tx
      .select({
        memberId: organizationMembers.id,
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        role: organizationMembers.role,
        isActive: organizationMembers.isActive,
        balance: balances.balance,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(
        balances,
        eq(balances.userId, users.id)
      )
      .where(eq(organizationMembers.tenantId, org.id))
      .orderBy(organizationMembers.joinedAt);
  });

  const sym = org.currencySymbol ?? "C";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization members
          </p>
        </div>
        <Link href="/admin/users/invite">
          <Button>Invite User</Button>
        </Link>
      </div>

      {members.length === 0 ? (
        <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
          No members yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Balance
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.memberId}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{m.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{m.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {formatCurrency(m.balance ?? 0, sym)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={m.isActive ? "success" : "destructive"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View
                    </Link>
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
