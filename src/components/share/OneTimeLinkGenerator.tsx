"use client";

import { useEffect, useState } from "react";
import { useShareLink, type ShareExpiry } from "@/src/hooks/useShareLink";

const expiryOptions: Array<{ value: ShareExpiry; label: string }> = [
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
];

export function OneTimeLinkGenerator() {
  const [facilityId, setFacilityId] = useState("us-east");
  const [expiry, setExpiry] = useState<ShareExpiry>("24h");
  const [timeRange, setTimeRange] = useState("last-7-days");
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const share = useShareLink(facilityId);

  useEffect(() => {
    if (!share.expiresAt) return;
    const update = () => setRemaining(Math.max(0, share.expiresAt! - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [share.expiresAt]);

  const countdown = remaining === null ? "" : `${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}m`;

  async function copyLink() {
    if (!share.url) return;
    await navigator.clipboard.writeText(share.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Temporary read-only access</h2>
        <p className="text-sm text-muted">Create a scoped link for a colleague or support engineer.</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Facility
          <select className="mt-2 w-full rounded-md border border-border-light bg-background px-3 py-2" value={facilityId} onChange={(event) => setFacilityId(event.target.value)}>
            <option value="us-east">US East</option>
            <option value="eu-west">EU West</option>
            <option value="ap-southeast">AP Southeast</option>
          </select>
        </label>
        <label className="text-sm font-medium">Dashboard range
          <select className="mt-2 w-full rounded-md border border-border-light bg-background px-3 py-2" value={timeRange} onChange={(event) => setTimeRange(event.target.value)}>
            <option value="last-24-hours">Last 24 hours</option>
            <option value="last-7-days">Last 7 days</option>
            <option value="last-30-days">Last 30 days</option>
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Link expires in</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {expiryOptions.map((option) => (
              <label className="flex items-center gap-2 text-sm text-muted" key={option.value}>
                <input type="radio" name="share-expiry" value={option.value} checked={expiry === option.value} onChange={() => setExpiry(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="mt-5 border-l-4 border-warning-fill bg-warning-bg px-3 py-2 text-sm font-medium text-warning-text">This link will stop working after the first visit.</p>
      {share.url ? (
        <div className="mt-5 space-y-3">
          <div className="flex gap-2">
            <input aria-label="Generated shared link" className="min-w-0 flex-1 rounded-md border border-border-light bg-background px-3 py-2 text-sm" readOnly value={share.url} />
            <button type="button" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-text" onClick={copyLink}>{copied ? "Copied" : "Copy"}</button>
          </div>
          <p className="text-xs text-muted">Expires in {countdown} · One remaining use</p>
        </div>
      ) : (
        <button type="button" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-text disabled:opacity-50" disabled={share.isGenerating} onClick={() => share.generate(expiry, timeRange)}>{share.isGenerating ? "Generating..." : "Generate Link"}</button>
      )}
      {share.error && <p className="mt-3 text-sm text-danger-text">{share.error}</p>}
    </section>
  );
}