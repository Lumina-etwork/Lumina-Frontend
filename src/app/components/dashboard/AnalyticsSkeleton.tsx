"use client";

import { Skeleton } from "@/src/app/components/ui/Skeleton";

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading analytics">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <Skeleton className="mb-4 h-6 w-40" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
        <div className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-700">
          <Skeleton className="mb-4 h-6 w-36" />
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
