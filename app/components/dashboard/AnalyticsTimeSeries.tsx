"use client";

import { useEffect, useState } from "react";

interface DataPoint {
  timestamp: string;
  value: number;
}

interface TimeSeriesProps {
  title: string;
  dataKey?: string;
  color?: string;
}

export function AnalyticsTimeSeries({ title, color = "#3b82f6" }: TimeSeriesProps) {
  const [Chart, setChart] = useState<React.ComponentType<any> | null>(null);
  const [Line, setLine] = useState<React.ComponentType<any> | null>(null);
  const [XAxis, setXAxis] = useState<React.ComponentType<any> | null>(null);
  const [YAxis, setYAxis] = useState<React.ComponentType<any> | null>(null);
  const [Tooltip, setTooltip] = useState<React.ComponentType<any> | null>(null);
  const [ResponsiveContainer, setResponsiveContainer] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const recharts = await import(
          /* webpackChunkName: "vendors-charts" */ "recharts"
        );
        if (!cancelled) {
          setChart(() => recharts.LineChart);
          setLine(() => recharts.Line);
          setXAxis(() => recharts.XAxis);
          setYAxis(() => recharts.YAxis);
          setTooltip(() => recharts.Tooltip);
          setResponsiveContainer(() => recharts.ResponsiveContainer);
        }
      } catch {
        if (!cancelled) setError("Failed to load chart library");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const data: DataPoint[] = Array.from({ length: 24 }, (_, i) => ({
    timestamp: `${i}:00`,
    value: Math.floor(Math.random() * 1000) + 500,
  }));

  if (error) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (!Chart || !Line || !XAxis || !YAxis || !Tooltip || !ResponsiveContainer) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <Chart data={data}>
          <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={11} />
          <YAxis stroke="#94a3b8" fontSize={11} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
