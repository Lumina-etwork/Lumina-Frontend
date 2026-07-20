"use client";

/**
 * Operator-facing dashboard for runtime configuration drift and canary status.
 */

import React from "react";
import { useConfigAudit } from "@/src/hooks/useConfigAudit";
import type { DriftFinding, DriftSeverity } from "@/src/lib/config";

const SEVERITY_STYLE: Record<DriftSeverity, string> = {
  critical: "text-red-400",
  warning: "text-amber-300",
  info: "text-sky-300",
};

function FindingRow({ finding }: { finding: DriftFinding }) {
  return (
    <tr className="border-b border-white/10 text-sm">
      <td className="py-2 pr-4 font-mono text-xs">{finding.service}</td>
      <td className="py-2 pr-4 font-mono text-xs">{finding.path}</td>
      <td className={`py-2 pr-4 uppercase ${SEVERITY_STYLE[finding.severity]}`}>
        {finding.severity}
      </td>
      <td className="py-2 pr-4 font-mono text-xs break-all">
        {String(finding.expected)}
      </td>
      <td className="py-2 font-mono text-xs break-all">
        {String(finding.actual)}
      </td>
    </tr>
  );
}

export function ConfigAuditDashboard() {
  const { lastReport, canary, runAudit } = useConfigAudit({
    runOnMount: true,
    intervalMs: 0,
    reportTelemetry: false,
  });

  const findings = lastReport?.findings ?? [];
  const metrics = lastReport?.metrics;

  return (
    <section
      aria-labelledby="config-audit-heading"
      className="mx-auto max-w-5xl px-4 py-10 text-zinc-100"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Operations
          </p>
          <h1
            id="config-audit-heading"
            className="mt-2 text-3xl font-semibold tracking-tight"
          >
            Runtime Configuration Audit
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Compares live service configuration against declared baselines.
            Critical path budget: &lt;100ms P99.
          </p>
        </div>
        <button
          type="button"
          onClick={() => runAudit()}
          className="rounded border border-zinc-500 px-4 py-2 text-sm hover:border-zinc-300"
        >
          Run audit
        </button>
      </header>

      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-zinc-500">Status</p>
          <p className="mt-1 text-xl font-medium">
            {lastReport == null
              ? "Pending"
              : lastReport.ok
                ? "In sync"
                : "Drift detected"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Last duration</p>
          <p className="mt-1 text-xl font-medium">
            {metrics ? `${metrics.durationMs.toFixed(2)} ms` : "—"}
            {metrics && (
              <span className="ml-2 text-sm text-zinc-400">
                {metrics.withinBudget ? "within budget" : "over budget"}
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Canary</p>
          <p className="mt-1 text-xl font-medium">
            {canary
              ? canary.promote
                ? "Promote"
                : "Hold"
              : "Collecting samples"}
          </p>
          {canary && (
            <p className="mt-1 text-xs text-zinc-400">{canary.reason}</p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-white/20 text-xs uppercase tracking-wide text-zinc-500">
              <th className="py-2 pr-4 font-medium">Service</th>
              <th className="py-2 pr-4 font-medium">Path</th>
              <th className="py-2 pr-4 font-medium">Severity</th>
              <th className="py-2 pr-4 font-medium">Expected</th>
              <th className="py-2 font-medium">Actual</th>
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-sm text-zinc-400">
                  No drift findings. All registered services match baseline{" "}
                  {lastReport?.baselineVersion ?? "—"}.
                </td>
              </tr>
            ) : (
              findings.map((finding) => (
                <FindingRow
                  key={`${finding.service}:${finding.path}`}
                  finding={finding}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
