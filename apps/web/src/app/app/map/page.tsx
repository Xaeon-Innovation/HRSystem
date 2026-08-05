"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, getTokens, wsUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Loc = {
  employeeId: string;
  name: string;
  role: string;
  jobTitle: string | null;
  lat: number;
  lng: number;
  updatedAt: string;
  secondsSinceUpdate: number;
  isClockedIn: boolean;
};

const LiveMap = dynamic(() => import("@/components/live-map"), { ssr: false });

export default function MapPage() {
  const [locations, setLocations] = useState<Loc[]>([]);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"ws" | "poll">("ws");
  const [error, setError] = useState<string | null>(null);

  async function poll() {
    const data = await api<{ locations: Loc[] }>(
      `/v1/admin/live-map${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    );
    setLocations(data.locations);
  }

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const startPoll = () => {
      setMode("poll");
      void poll().catch((e) => setError(e.message));
      pollTimer = setInterval(() => {
        void poll().catch(() => undefined);
      }, 5000);
    };

    void poll().catch((e) => setError(e.message));

    const { access } = getTokens();
    if (!access) {
      startPoll();
      return;
    }

    try {
      ws = new WebSocket(wsUrl(access));
      ws.onopen = () => {
        setMode("ws");
        ws?.send(JSON.stringify({ type: "subscribe.map" }));
        if (fallbackTimer) clearTimeout(fallbackTimer);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as {
          type: string;
          payload?: Partial<Loc> & { employeeId: string };
        };
        if (msg.type === "location.update" && msg.payload) {
          setLocations((prev) => {
            const idx = prev.findIndex(
              (p) => p.employeeId === msg.payload!.employeeId,
            );
            const next = {
              employeeId: msg.payload!.employeeId,
              name: prev[idx]?.name ?? "Employee",
              role: prev[idx]?.role ?? "employee",
              jobTitle: prev[idx]?.jobTitle ?? null,
              lat: msg.payload!.lat ?? 0,
              lng: msg.payload!.lng ?? 0,
              updatedAt: msg.payload!.updatedAt ?? new Date().toISOString(),
              secondsSinceUpdate: 0,
              isClockedIn: true,
            };
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...next };
              return copy;
            }
            return [...prev, next];
          });
        }
      };
      ws.onerror = () => {
        ws?.close();
      };
      ws.onclose = () => {
        startPoll();
      };
      fallbackTimer = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) startPoll();
      }, 4000);
    } catch {
      startPoll();
    }

    return () => {
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [q]);

  const center = useMemo(() => {
    if (!locations.length) return { lat: 30.0444, lng: 31.2357 };
    return { lat: locations[0].lat, lng: locations[0].lng };
  }, [locations]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live map</h1>
          <p className="text-sm text-muted-foreground">
            Mode: {mode === "ws" ? "realtime" : "REST polling fallback"}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-40"
          />
          <Button variant="outline" onClick={() => void poll()}>
            Refresh
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="h-[60vh] overflow-hidden rounded-lg border">
        <LiveMap center={center} locations={locations} />
      </div>
      <ul className="space-y-2 text-sm">
        {locations.map((l) => (
          <li key={l.employeeId} className="rounded-md border bg-white/70 px-3 py-2">
            <span className="font-medium">{l.name}</span> · {l.jobTitle ?? l.role} ·
            updated {l.secondsSinceUpdate ?? 0}s ago
          </li>
        ))}
      </ul>
    </div>
  );
}
