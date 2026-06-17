"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function NetworkSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading network topology">
      <Skeleton className="h-[400px] w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-20 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-3 w-16 rounded-full" />
      </div>
    </div>
  );
}
