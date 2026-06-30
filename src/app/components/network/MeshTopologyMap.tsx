"use client";

import { useEffect, useRef } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  status: "active" | "syncing" | "offline";
}

interface Edge {
  source: string;
  target: string;
  latency: number;
}

const MOCK_NODES: Node[] = [
  { id: "n1", x: 200, y: 150, label: "Validator 1", status: "active" },
  { id: "n2", x: 400, y: 100, label: "Validator 2", status: "active" },
  { id: "n3", x: 300, y: 300, label: "Validator 3", status: "syncing" },
  { id: "n4", x: 500, y: 250, label: "Observer 1", status: "active" },
  { id: "n5", x: 100, y: 280, label: "Observer 2", status: "offline" },
];

const MOCK_EDGES: Edge[] = [
  { source: "n1", target: "n2", latency: 12 },
  { source: "n1", target: "n3", latency: 34 },
  { source: "n2", target: "n4", latency: 8 },
  { source: "n3", target: "n4", latency: 21 },
  { source: "n3", target: "n5", latency: 45 },
];

const STATUS_COLORS: Record<Node["status"], string> = {
  active: "#22c55e",
  syncing: "#eab308",
  offline: "#ef4444",
};

export function MeshTopologyMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    MOCK_EDGES.forEach((edge) => {
      const src = MOCK_NODES.find((n) => n.id === edge.source);
      const tgt = MOCK_NODES.find((n) => n.id === edge.target);
      if (!src || !tgt) return;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);
      ctx.strokeStyle = "rgba(100, 116, 139, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      ctx.fillStyle = "#94a3b8";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${edge.latency}ms`, mx, my - 6);
    });

    MOCK_NODES.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = STATUS_COLORS[node.status];
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(node.label, node.x, node.y + 24);
    });
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="h-[400px] w-full rounded-xl border border-zinc-200 dark:border-zinc-700"
        style={{ width: "100%", height: "400px" }}
      />
      <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Active
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-yellow-500" /> Syncing
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Offline
        </span>
      </div>
    </div>
  );
}
