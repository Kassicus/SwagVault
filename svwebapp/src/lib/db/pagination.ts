export const DEFAULT_PAGE_SIZE = 20;

export function parsePaginationParams(searchParams: Record<string, string | string[] | undefined>) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.pageSize) || DEFAULT_PAGE_SIZE));
  const sort = (searchParams.sort as string) || undefined;
  const order = (searchParams.order as string) === "asc" ? "asc" as const : "desc" as const;
  return { page, pageSize, sort, order };
}

export function paginationOffset(page: number, pageSize: number) {
  return (page - 1) * pageSize;
}

export function totalPages(totalCount: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
