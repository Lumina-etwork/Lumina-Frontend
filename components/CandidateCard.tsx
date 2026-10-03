import type { RankedCandidate } from '@/lib/types';

export default function CandidateCard({
  candidate,
  rank,
}: {
  candidate: RankedCandidate;
  rank: number;
}) {
  const matched = new Set(candidate.matched_skills.map((s) => s.toLowerCase()));

  return (
    <article className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-sm font-semibold text-aurora-400">
            {rank}
          </span>
          <div>
            <p className="font-semibold text-slate-100">{candidate.node_id}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-600">
              pseudonymous candidate
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-lg font-semibold text-aurora-400">{candidate.match_score.toFixed(1)}</p>
          <p className="text-[11px] uppercase tracking-wide text-slate-600">match</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-ink-800/60 py-2">
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Merit</dt>
          <dd className="text-sm font-medium text-slate-200">{candidate.merit_score}</dd>
        </div>
        <div className="rounded-lg bg-ink-800/60 py-2">
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Completion</dt>
          <dd className="text-sm font-medium text-slate-200">
            {candidate.milestone_completion_rate}%
          </dd>
        </div>
        <div className="rounded-lg bg-ink-800/60 py-2">
          <dt className="text-[10px] uppercase tracking-wide text-slate-500">Escrows</dt>
          <dd className="text-sm font-medium text-slate-200">{candidate.completed_escrows}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {candidate.verified_skills.map((skill) => {
          const isMatch = matched.has(skill.toLowerCase());
          return (
            <span
              key={skill}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                isMatch
                  ? 'border-aurora-500/40 bg-aurora-500/15 text-aurora-300'
                  : 'border-ink-700 bg-ink-800/60 text-slate-400'
              }`}
            >
              {skill}
            </span>
          );
        })}
      </div>
    </article>
  );
}
