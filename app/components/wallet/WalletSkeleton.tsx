"use client";

import { Skeleton } from "@/app/components/ui/Skeleton";

export function WalletSkeleton() {
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-700"
      role="status"
      aria-label="Loading wallet"
    >
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}
