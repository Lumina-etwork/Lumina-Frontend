'use client'

import { NetworkActivityHeatmap } from '@/src/components/network/NetworkActivityHeatmap'

export default function NetworkActivityPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#171512]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-[#d8d0c1] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6f5f48]">
              Network Monitor
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#171512] sm:text-4xl">
              Network Activity
            </h1>
          </div>
        </header>

        <div className="py-6">
          <NetworkActivityHeatmap
            wsUrl="ws://localhost:8080/network/activity"
            height={600}
          />
        </div>

        <section className="rounded-lg border border-[#d8d0c1] bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-[#1a1410]">
            About This Visualization
          </h2>
          <div className="space-y-2 text-sm text-[#6f5f48]">
            <p>
              This heatmap displays real-time network message activity across geographic regions.
              Cell color intensity represents message volume, from blue (low) to red (high).
            </p>
            <p>
              Animated arcs show inter-region traffic flow with colored particles indicating
              message direction. Time range controls allow switching between real-time (5min
              sliding window), hourly, 6-hour, and 24-hour views.
            </p>
            <p>
              Data is aggregated by geographic cells at 0.1 degree resolution. The heatmap
              updates every 1 second with newly arrived WebSocket messages.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
