"use client";

import { Skeleton } from "@/src/app/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
            <Skeleton className="mb-3 h-4 w-20" />
            <Skeleton className="mb-2 h-8 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
      </div>
    </div>
  );
}
