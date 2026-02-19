import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl">
      <Skeleton className="mb-6 h-8 w-36" />

      {/* Profile cards grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-6 w-36" />
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-28" />
        </div>
      </div>

      {/* Recent Transactions card */}
      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="border-b border-border p-6">
          <Skeleton className="h-6 w-44" />
        </div>
        <div className="divide-y divide-border p-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
            >
              <div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-1 h-3 w-32" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
