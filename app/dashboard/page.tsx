import dynamic from "next/dynamic";
import { DashboardSkeleton } from "@/app/components/dashboard/DashboardSkeleton";

const MeshTopologyMap = dynamic(
  () => import("@/app/components/network/MeshTopologyMap").then((m) => ({ default: m.MeshTopologyMap })),
  {
    loading: () => (
      <div className="h-[400px] w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700" />
    ),
  }
);

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Dashboard Overview</h1>
      <DashboardSkeleton />
      <section>
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Network Topology
        </h2>
        <MeshTopologyMap />
      </section>
    </div>
  );
}
