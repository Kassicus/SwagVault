import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { withTenant } from "@/lib/db/tenant";
import { organizationMembers, users, balances } from "@/lib/db/schema";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { requireAuth } from "@/lib/auth/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const org = await getResolvedTenant();
  const params = await searchParams;
  const { page, pageSize } = parsePaginationParams(params);

  const { data: members, total } = await withTenant(org.id, async (tx) => {
    const [countResult] = await tx
      .select({ count: count() })
      .from(organizationMembers)
      .where(eq(organizationMembers.tenantId, org.id));

    const data = await tx
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
      .leftJoin(balances, eq(balances.userId, users.id))
      .where(eq(organizationMembers.tenantId, org.id))
      .orderBy(organizationMembers.joinedAt)
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { data, total: countResult?.count ?? 0 };
  });

  const sym = org.currencySymbol ?? "C";
  const tenant = params.tenant as string | undefined;
  const baseParams: Record<string, string> = {};
  if (tenant) baseParams.tenant = tenant;
  const exportUrl = `/api/export?type=users${tenant ? `&tenant=${tenant}` : ""}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage your organization members ({total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href={exportUrl}>
            <Button variant="outline" size="sm">Export CSV</Button>
          </a>
          <Link href="/admin/users/invite">
            <Button>Invite User</Button>
          </Link>
        </div>
      </div>

      <DataTable
        columns={[
          { header: "Name", cell: (row) => <span className="font-medium">{row.displayName as string}</span> },
          { header: "Email", cell: (row) => <span className="text-muted-foreground">{row.email as string}</span> },
          { header: "Role", cell: (row) => <Badge variant="outline">{row.role as string}</Badge> },
          { header: "Balance", cell: (row) => formatCurrency((row.balance as number) ?? 0, sym) },
          {
            header: "Status",
            cell: (row) => (
              <Badge variant={row.isActive ? "success" : "destructive"}>
                {row.isActive ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            header: "Actions",
            className: "text-right",
            cell: (row) => (
              <Link href={`/admin/users/${row.userId}`} className="text-sm text-primary hover:underline">
                View
              </Link>
            ),
          },
        ]}
        data={members}
        emptyMessage="No members yet"
        currentPage={page}
        totalPages={totalPages(total, pageSize)}
        baseParams={baseParams}
      />
    </div>
  );
}
