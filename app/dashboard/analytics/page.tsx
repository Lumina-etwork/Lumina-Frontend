import dynamic from "next/dynamic";
import { AnalyticsSkeleton } from "@/app/components/dashboard/AnalyticsSkeleton";

const AnalyticsTimeSeries = dynamic(
  () =>
    import("@/app/components/dashboard/AnalyticsTimeSeries").then((m) => ({
      default: m.AnalyticsTimeSeries,
    })),
  { loading: () => <AnalyticsSkeleton /> }
);

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Analytics</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Historical metrics and charting visualizations.
      </p>
      <AnalyticsSkeleton />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsTimeSeries title="TVL Over Time" color="#3b82f6" />
        <AnalyticsTimeSeries title="Stream Volume" color="#10b981" />
        <AnalyticsTimeSeries title="Active Wallets" color="#f59e0b" />
        <AnalyticsTimeSeries title="Transactions per Hour" color="#8b5cf6" />
      </div>
    </div>
  );
}
