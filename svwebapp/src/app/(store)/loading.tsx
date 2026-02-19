import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Search bar skeleton */}
      <Skeleton className="mb-4 h-10 w-full max-w-sm rounded-md" />

      {/* Category pills skeleton */}
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Item cards grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card"
          >
            <Skeleton className="aspect-square w-full rounded-t-lg" />
            <div className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-2 flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
