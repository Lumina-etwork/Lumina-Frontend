import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800",
        className
      )}
    >
      <div
        className="h-full bg-zinc-900 transition-all duration-300 dark:bg-zinc-50"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
