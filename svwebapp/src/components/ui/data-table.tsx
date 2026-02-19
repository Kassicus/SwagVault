import Link from "next/link";
import { cn } from "@/lib/utils";
import { Pagination } from "./pagination";
import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
  currentPage?: number;
  totalPages?: number;
  currentSort?: string;
  currentOrder?: "asc" | "desc";
  baseParams?: Record<string, string>;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No data found",
  className,
  currentPage,
  totalPages: totalPagesCount,
  currentSort,
  currentOrder = "desc",
  baseParams = {},
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  function sortHref(sortKey: string) {
    const params = new URLSearchParams(baseParams);
    params.set("sort", sortKey);
    params.set("order", currentSort === sortKey && currentOrder === "asc" ? "desc" : "asc");
    params.set("page", "1");
    return `?${params.toString()}`;
  }

  return (
    <div>
      <div className={cn("overflow-x-auto rounded-lg border border-border", className)}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.header}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground",
                    col.className
                  )}
                >
                  {col.sortKey ? (
                    <Link
                      href={sortHref(col.sortKey)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {currentSort === col.sortKey && (
                        <span className="text-xs">
                          {currentOrder === "asc" ? "\u2191" : "\u2193"}
                        </span>
                      )}
                    </Link>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={(row.id as string) ?? i}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                {columns.map((col) => (
                  <td key={col.header} className={cn("px-4 py-3", col.className)}>
                    {col.cell
                      ? col.cell(row)
                      : col.accessorKey
                        ? String(row[col.accessorKey as string] ?? "")
                        : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {currentPage && totalPagesCount && totalPagesCount > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPagesCount}
          baseParams={baseParams}
        />
      )}
    </div>
  );
}
