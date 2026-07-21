import { ConfigAuditDashboard } from "@/src/components/dashboard/ConfigAuditDashboard";

export const metadata = {
  title: "Config Audit | Lumina",
  description: "Runtime configuration auditing and drift detection dashboard",
};

export default function ConfigAuditPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <ConfigAuditDashboard />
    </main>
  );
}
