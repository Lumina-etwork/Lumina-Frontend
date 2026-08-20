"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const FacilityDashboard = dynamic(() => import("@/src/components/dashboard/FacilityDashboard").then((module) => module.FacilityDashboard), { ssr: false });

type SharedAccess = { facilityId: string; timeRange: string; permissions: "read-only" };

export default function SharedDashboardView({ params }: { params: Promise<{ token: string }> }) {
  const [access, setAccess] = useState<SharedAccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void params.then(async ({ token }) => {
      const response = await fetch("/api/share/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = (await response.json()) as SharedAccess & { error?: string };
      if (!active) return;
      if (!response.ok) setError(result.error ?? "This shared link is no longer available");
      else setAccess(result);
    }).catch(() => active && setError("This shared link is no longer available"));
    return () => { active = false; };
  }, [params]);

  if (error) return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground"><div className="max-w-md rounded-lg border border-border bg-surface p-6 text-center"><h1 className="text-xl font-semibold">Shared link unavailable</h1><p className="mt-2 text-sm text-muted">{error}</p></div></main>;
  if (!access) return <main className="flex min-h-screen items-center justify-center bg-background text-muted">Validating shared link...</main>;

  return <><div className="sticky top-0 z-10 border-b border-warning-fill bg-warning-bg px-4 py-3 text-center text-sm font-semibold text-warning-text">EXTERNAL VIEW -- Read Only · {access.facilityId} · {access.timeRange}</div><FacilityDashboard /></>;
}