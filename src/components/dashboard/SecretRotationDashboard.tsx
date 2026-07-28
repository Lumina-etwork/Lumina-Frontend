"use client";

import React from "react";
import { useSecretRotation } from "@/src/hooks/useSecretRotation";

export function SecretRotationDashboard() {
  const { lastReport, runAssessment } = useSecretRotation();
  const findings = lastReport?.findings ?? [];

  return (
    <section aria-labelledby="secret-rotation-heading" className="mx-auto max-w-5xl px-4 py-10 text-zinc-100">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Security operations</p>
          <h1 id="secret-rotation-heading" className="mt-2 text-3xl font-semibold tracking-tight">Secret Rotation Service</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">Tracks database credentials and API keys, creates blue-green rotation plans, and keeps critical checks under the &lt;100ms P99 target.</p>
        </div>
        <button type="button" onClick={() => runAssessment()} className="rounded border border-zinc-500 px-4 py-2 text-sm hover:border-zinc-300">Assess rotation</button>
      </header>

      <div className="mb-8 grid gap-6 sm:grid-cols-4">
        <Metric label="Status" value={lastReport == null ? "Pending" : lastReport.ok ? "Healthy" : "Action needed"} />
        <Metric label="Critical" value={String(lastReport?.metrics.criticalCount ?? 0)} />
        <Metric label="Warnings" value={String(lastReport?.metrics.warningCount ?? 0)} />
        <Metric label="Latency" value={lastReport ? `${lastReport.metrics.durationMs.toFixed(2)} ms` : "—"} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[720px] text-left">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-500"><tr><th className="p-3">Service</th><th className="p-3">Secret</th><th className="p-3">Status</th><th className="p-3">Severity</th><th className="p-3">Due</th><th className="p-3">Plan</th></tr></thead>
          <tbody>
            {findings.map((finding) => {
              const plan = lastReport?.plans.find((candidate) => candidate.secretId === finding.secretId);
              return <tr className="border-t border-white/10 text-sm" key={finding.secretId}><td className="p-3 font-mono text-xs">{finding.service}</td><td className="p-3 font-mono text-xs">{finding.secretId}</td><td className="p-3">{finding.status}</td><td className="p-3 uppercase">{finding.severity}</td><td className="p-3">{new Date(finding.dueAt).toISOString().slice(0, 10)}</td><td className="p-3 text-zinc-300">{plan ? `${plan.phases.length} phases to ${plan.nextVersion}` : "No rotation needed"}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase text-zinc-500">{label}</p><p className="mt-1 text-xl font-medium">{value}</p></div>;
}
