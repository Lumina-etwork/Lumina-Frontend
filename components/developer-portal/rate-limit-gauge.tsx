import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface RateLimitGaugeProps {
  current: number;
  limit: number;
  className?: string;
}

export function RateLimitGauge({ current, limit, className }: RateLimitGaugeProps) {
  const percentage = (current / limit) * 100;
  const isWarning = percentage >= 70;
  const isCritical = percentage >= 90;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          {current}/{limit} req/min
        </span>
        <span
          className={cn(
            "font-medium",
            isCritical
              ? "text-red-600 dark:text-red-400"
              : isWarning
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-green-600 dark:text-green-400"
          )}
        >
          {percentage.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={current}
        max={limit}
        className={cn(
          "h-2",
          isCritical
            ? "[&>div]:bg-red-600 dark:[&>div]:bg-red-400"
            : isWarning
            ? "[&>div]:bg-yellow-600 dark:[&>div]:bg-yellow-400"
            : "[&>div]:bg-green-600 dark:[&>div]:bg-green-400"
        )}
      />
    </div>
  );
}
