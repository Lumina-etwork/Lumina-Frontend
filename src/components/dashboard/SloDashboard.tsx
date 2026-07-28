import { evaluateSloPortfolio } from "@/src/lib/slo";
import { sloMetricSamples, sloObjectives } from "@/src/lib/slo/fixtures";

const severityClass = {
  ok: "border-emerald-800 bg-emerald-950/30 text-emerald-200",
  warning: "border-amber-800 bg-amber-950/30 text-amber-200",
  critical: "border-red-800 bg-red-950/30 text-red-200",
};

const percent = (value: number) => `${(value * 100).toFixed(4)}%`;

export function SloDashboard() {
  const evaluations = evaluateSloPortfolio(sloObjectives, sloMetricSamples);
  const criticalCount = evaluations.filter((evaluation) => evaluation.severity === "critical").length;
  const warningCount = evaluations.filter((evaluation) => evaluation.severity === "warning").length;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 text-zinc-100" aria-labelledby="slo-heading">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Reliability</p>
          <h1 id="slo-heading" className="mt-2 text-3xl font-semibold tracking-tight">
            SLO Monitoring & Burn Rate Alerts
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Tracks 99.99% availability, &lt;100ms P99 critical-path latency, and multi-window burn-rate alerts across Lumina services.
          </p>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm">
          <p className="text-zinc-400">Active alerts</p>
          <p className="text-2xl font-semibold">{criticalCount + warningCount}</p>
        </div>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase text-zinc-500">Availability target</p>
          <p className="mt-2 text-2xl font-bold">99.99%</p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase text-zinc-500">Critical path P99</p>
          <p className="mt-2 text-2xl font-bold">&lt;100ms</p>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs uppercase text-zinc-500">Deployment guard</p>
          <p className="mt-2 text-2xl font-bold">Blue/green + canary</p>
        </div>
      </div>

      <div className="grid gap-4">
        {evaluations.map((evaluation) => (
          <article key={evaluation.objective.id} className={`rounded border p-5 ${severityClass[evaluation.severity]}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase opacity-70">{evaluation.objective.service}</p>
                <h2 className="mt-1 text-xl font-semibold">{evaluation.objective.name}</h2>
                <p className="mt-2 text-sm opacity-80">{evaluation.alertSummary}</p>
              </div>
              <span className="rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase">
                {evaluation.severity}
              </span>
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-4">
              <div><dt className="text-xs opacity-70">Availability</dt><dd className="text-lg font-semibold">{percent(evaluation.availability)}</dd></div>
              <div><dt className="text-xs opacity-70">Budget consumed</dt><dd className="text-lg font-semibold">{percent(evaluation.errorBudgetConsumed)}</dd></div>
              <div><dt className="text-xs opacity-70">Burn rate</dt><dd className="text-lg font-semibold">{evaluation.burnRate.toFixed(2)}x</dd></div>
              <div><dt className="text-xs opacity-70">P99 latency</dt><dd className="text-lg font-semibold">{evaluation.latencyP99Ms}ms</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
