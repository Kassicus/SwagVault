import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseParams: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams(baseParams);
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 py-4" aria-label="Pagination">
      <Link
        href={buildHref(currentPage - 1)}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          currentPage <= 1
            ? "pointer-events-none text-muted-foreground/50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-disabled={currentPage <= 1}
      >
        Previous
      </Link>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              p === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {p}
          </Link>
        )
      )}

      <Link
        href={buildHref(currentPage + 1)}
        className={cn(
          "rounded-md px-3 py-1.5 text-sm transition-colors",
          currentPage >= totalPages
            ? "pointer-events-none text-muted-foreground/50"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-disabled={currentPage >= totalPages}
      >
        Next
      </Link>
    </nav>
  );
}
