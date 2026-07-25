"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from "recharts";
import { calculateCapacityPlan, type CapacityUsageSample } from "@/src/lib/capacityPlanning";

type TimeRange = "24h" | "7d" | "30d" | "custom";

interface UsageDashboardProps {
  apiKeyId?: string;
}

interface UsageData extends CapacityUsageSample {
  errors: number;
  latency: number;
  latencyMs?: number;
}

interface TopEndpoint {
  path: string;
  requests: number;
  avgLatency: number;
}

export function UsageDashboard({ apiKeyId }: UsageDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  // Mock data - in production, this would come from the API
  const usageData: UsageData[] = [
    { timestamp: "2026-07-19", requests: 1850, capacity: 3200, errors: 8, latency: 45, latencyMs: 45 },
    { timestamp: "2026-07-20", requests: 2040, capacity: 3200, errors: 10, latency: 52, latencyMs: 52 },
    { timestamp: "2026-07-21", requests: 2280, capacity: 3200, errors: 12, latency: 49, latencyMs: 49 },
    { timestamp: "2026-07-22", requests: 2510, capacity: 3200, errors: 16, latency: 57, latencyMs: 57 },
    { timestamp: "2026-07-23", requests: 2760, capacity: 3600, errors: 14, latency: 54, latencyMs: 54 },
    { timestamp: "2026-07-24", requests: 3010, capacity: 3600, errors: 18, latency: 61, latencyMs: 61 },
    { timestamp: "2026-07-25", requests: 3260, capacity: 3600, errors: 20, latency: 64, latencyMs: 64 },
  ];

  const topEndpoints: TopEndpoint[] = [
    { path: "/api/v1/validator/status", requests: 1250, avgLatency: 42 },
    { path: "/api/v1/network/info", requests: 980, avgLatency: 38 },
    { path: "/api/v1/staking/pools", requests: 750, avgLatency: 55 },
    { path: "/api/v1/governance/proposals", requests: 420, avgLatency: 68 },
    { path: "/api/v1/staking/delegate", requests: 180, avgLatency: 120 },
  ];

  const capacityPlan = calculateCapacityPlan(usageData, timeRange === "30d" ? 30 : timeRange === "7d" ? 14 : 7);

  const summaryStats = {
    totalRequests: usageData.reduce((sum, point) => sum + point.requests, 0),
    errorRate: (usageData.reduce((sum, point) => sum + point.errors, 0) / usageData.reduce((sum, point) => sum + point.requests, 0)) * 100,
    p50Latency: 54,
    p95Latency: 89,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Usage Dashboard
        </h2>
        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              onClick={() => setTimeRange(range)}
              className={
                timeRange === range
                  ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              }
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {summaryStats.totalRequests.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {summaryStats.errorRate.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              P50 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {summaryStats.p50Latency}ms
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              P95 Latency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {summaryStats.p95Latency}ms
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Planning */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Current Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {capacityPlan.currentUtilizationPercent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Historical Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {capacityPlan.averageGrowthPercent.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Saturation Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {capacityPlan.daysUntilSaturation === null ? "None" : `${capacityPlan.daysUntilSaturation}d`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Recommended Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {capacityPlan.recommendedCapacity.toLocaleString()} req/day
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capacity Forecast</CardTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Historical usage trends are projected forward with 20% safety headroom and a scale/watch/stable recommendation{apiKeyId ? ` for ${apiKeyId}` : " across all active keys"}.
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            Recommendation: <span className="font-semibold capitalize">{capacityPlan.recommendation}</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={capacityPlan.forecast}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis dataKey="timestamp" className="text-zinc-500 dark:text-zinc-400" />
                <YAxis className="text-zinc-500 dark:text-zinc-400" />
                <Tooltip />
                <ReferenceLine y={85} stroke="#f97316" strokeDasharray="4 4" label="Scale threshold" />
                <Area type="monotone" dataKey="projectedUtilizationPercent" stroke="#2563eb" fill="#93c5fd" name="Projected utilization %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Requests Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Requests Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-800" />
                <XAxis
                  dataKey="timestamp"
                  className="text-zinc-500 dark:text-zinc-400"
                />
                <YAxis className="text-zinc-500 dark:text-zinc-400" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-zinc-900 dark:text-zinc-50"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Top Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topEndpoints.map((endpoint, index) => (
              <div key={endpoint.path} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-50">
                      {endpoint.path}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {endpoint.requests.toLocaleString()} requests · {endpoint.avgLatency}ms avg
                    </div>
                  </div>
                </div>
                <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full bg-zinc-900 dark:bg-zinc-50"
                    style={{
                      width: `${(endpoint.requests / topEndpoints[0].requests) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
