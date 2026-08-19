"use client";

import { useState } from "react";

export type ShareExpiry = "1h" | "24h" | "7d";

export function useShareLink(facilityId: string) {
  const [state, setState] = useState<{ url: string; expiresAt: number; remainingUses: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(expiry: ShareExpiry, timeRange = "last-7-days") {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/share/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ facilityId, expiry, timeRange }),
      });
      const result = (await response.json()) as { url?: string; expiresAt?: number; remainingUses?: number; error?: string };
      if (!response.ok || !result.url || !result.expiresAt) throw new Error(result.error ?? "Unable to generate link");
      setState({ url: result.url, expiresAt: result.expiresAt, remainingUses: result.remainingUses ?? 1 });
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to generate link");
    } finally {
      setIsGenerating(false);
    }
  }

  return { ...state, isGenerating, error, generate };
}