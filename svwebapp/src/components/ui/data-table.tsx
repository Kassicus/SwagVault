import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  "px-4 py-3 text-left font-medium text-muted-foreground",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={(row as Record<string, unknown>).id as string ?? i}
              className="border-b border-border last:border-0 hover:bg-muted/50"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn("px-4 py-3", col.className)}
                >
                  {col.cell
                    ? col.cell(row)
                    : col.accessorKey
                      ? String((row as Record<string, unknown>)[col.accessorKey as string] ?? "")
                      : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
