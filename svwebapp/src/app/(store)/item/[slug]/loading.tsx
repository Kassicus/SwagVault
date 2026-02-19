import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full rounded-lg" />

      {/* Details skeleton */}
      <div>
        <Skeleton className="h-9 w-3/4" />

        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        <div className="mt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <Skeleton className="mt-8 h-11 w-40 rounded-md" />
      </div>
    </div>
  );
}
