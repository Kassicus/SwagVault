import { Skeleton } from '@/components/ui/skeleton';

export default function MembersLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="border-2 border-foreground p-4 space-y-3">
        <Skeleton className="h-4 w-44" />
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="border-2 border-foreground p-4 space-y-3">
        <Skeleton className="h-4 w-56" />
        <div className="grid gap-3 md:grid-cols-[1fr_120px_1fr_auto]">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="border-2 border-foreground">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b-2 border-foreground/10 px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <div className="flex-1" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
