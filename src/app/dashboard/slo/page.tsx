import { SloDashboard } from "@/src/components/dashboard/SloDashboard";

export const metadata = {
  title: "SLO Monitoring | Lumina",
  description: "Service-level objectives, burn-rate alerts, and reliability deployment gates.",
};

export default function SloPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <SloDashboard />
    </main>
  );
}
