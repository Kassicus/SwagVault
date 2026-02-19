import { eq, desc, count, and } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { auditLogs } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/utils";
import { getResolvedTenant } from "@/lib/tenant/with-tenant-page";
import { parsePaginationParams, paginationOffset, totalPages } from "@/lib/db/pagination";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";

export default async function AuditLogPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const org = await getResolvedTenant();
  const searchParams = await props.searchParams;
  const { page, pageSize } = parsePaginationParams(searchParams);
  const actionFilter = searchParams.action as string | undefined;

  const { logs, total } = await withTenant(org.id, async (tx) => {
    const conditions = [eq(auditLogs.tenantId, org.id)];
    if (actionFilter) {
      conditions.push(eq(auditLogs.action, actionFilter));
    }
    const where = and(...conditions);

    const [totalRow] = await tx
      .select({ count: count() })
      .from(auditLogs)
      .where(where);

    const rows = await tx
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(pageSize)
      .offset(paginationOffset(page, pageSize));

    return { logs: rows, total: totalRow?.count ?? 0 };
  });

  const columns = [
    {
      header: "Timestamp",
      cell: (row: (typeof logs)[0]) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatRelativeTime(row.createdAt)}
        </span>
      ),
    },
    {
      header: "Action",
      cell: (row: (typeof logs)[0]) => (
        <Badge variant="outline">{row.action}</Badge>
      ),
    },
    {
      header: "Resource",
      cell: (row: (typeof logs)[0]) => (
        <span className="text-sm">
          {row.resourceType}
          {row.resourceId && (
            <span className="ml-1 text-xs text-muted-foreground">
              {row.resourceId.slice(0, 8)}...
            </span>
          )}
        </span>
      ),
    },
    {
      header: "User",
      cell: (row: (typeof logs)[0]) => (
        <span className="text-sm text-muted-foreground">
          {row.userId ? `${row.userId.slice(0, 8)}...` : "System"}
        </span>
      ),
    },
    {
      header: "IP",
      cell: (row: (typeof logs)[0]) => (
        <span className="text-xs text-muted-foreground">
          {row.ipAddress ?? "—"}
        </span>
      ),
    },
  ];

  const baseParams: Record<string, string> = {};
  if (actionFilter) baseParams.action = actionFilter;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Track all admin and API actions
        </p>
      </div>

      {/* Filter chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip label="All" action={undefined} current={actionFilter} />
        <FilterChip label="Items" action="item" current={actionFilter} />
        <FilterChip label="Orders" action="order" current={actionFilter} />
        <FilterChip label="Members" action="member" current={actionFilter} />
        <FilterChip label="Currency" action="currency" current={actionFilter} />
        <FilterChip label="Settings" action="settings" current={actionFilter} />
        <FilterChip label="API Keys" action="api_key" current={actionFilter} />
        <FilterChip label="Webhooks" action="webhook" current={actionFilter} />
      </div>

      <DataTable
        columns={columns}
        data={logs as (typeof logs[number] & Record<string, unknown>)[]}
        currentPage={page}
        totalPages={totalPages(total, pageSize)}
        emptyMessage="No audit log entries yet"
        baseParams={baseParams}
      />
    </div>
  );
}

function FilterChip({
  label,
  action,
  current,
}: {
  label: string;
  action: string | undefined;
  current: string | undefined;
}) {
  const isActive = action === current || (!action && !current);
  const href = action ? `?action=${action}` : "?";
  return (
    <a
      href={href}
      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {label}
    </a>
  );
}
