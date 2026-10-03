'use client';

import { FormEvent, useEffect, useState } from 'react';
import CandidateCard from '@/components/CandidateCard';
import { getBlindPool, matchCandidates } from '@/lib/api';
import type { BlindCandidate, RankedCandidate } from '@/lib/types';

export default function TalentPage() {
  const [skillsInput, setSkillsInput] = useState('Rust, Soroban, Smart Contracts');
  const [minMerit, setMinMerit] = useState(100);
  const [pool, setPool] = useState<BlindCandidate[]>([]);
  const [ranked, setRanked] = useState<RankedCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    getBlindPool()
      .then(setPool)
      .catch(() => setPool([]));
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMatching(true);
    setError(null);

    const required_skills = skillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      setRanked(await matchCandidates({ required_skills, min_merit_score: minMerit }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Matching failed');
      setRanked(null);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Blind talent matching</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Candidates are ranked on verified skills, merit and delivery history only. Names, gender,
          age, location, photos and school prestige are stripped before ranking and never returned.
          {pool.length > 0 && (
            <>
              {' '}
              <span className="text-slate-500">{pool.length} anonymized nodes available.</span>
            </>
          )}
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-xl border border-ink-800 bg-ink-900/60 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      >
        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">
            Required skills
          </span>
          <input
            value={skillsInput}
            onChange={(event) => setSkillsInput(event.target.value)}
            placeholder="Rust, Soroban, Smart Contracts"
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600 focus:border-aurora-500"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">
            Min merit score
          </span>
          <input
            type="number"
            min={0}
            value={minMerit}
            onChange={(event) => setMinMerit(Number(event.target.value))}
            className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-slate-100 outline-none focus:border-aurora-500"
          />
        </label>

        <button
          type="submit"
          disabled={matching}
          className="h-[42px] rounded-lg bg-aurora-500 px-4 text-sm font-semibold text-ink-950 transition hover:bg-aurora-400 disabled:opacity-50"
        >
          {matching ? 'Matching…' : 'Find matches'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {ranked && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            {ranked.length === 0 ? 'No candidates passed the filters' : `${ranked.length} ranked candidates`}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((candidate, index) => (
              <CandidateCard key={candidate.node_id} candidate={candidate} rank={index + 1} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
