"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, getTokens, wsUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { HistoryPoint, LiveLoc } from "@/components/live-map";

const LiveMap = dynamic(() => import("@/components/live-map"), { ssr: false });

type Presence = "all" | "on_shift" | "last_seen";

type EmployeeOpt = {
  id: string;
  name: string;
  jobTitle: string | null;
};

type Session = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
};

function nearestPoint(
  points: HistoryPoint[],
  targetMs: number,
): HistoryPoint | null {
  if (!points.length) return null;
  let best = points[0]!;
  let bestDiff = Math.abs(new Date(best.recordedAt).getTime() - targetMs);
  for (const p of points) {
    const diff = Math.abs(new Date(p.recordedAt).getTime() - targetMs);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

function toLocalDateInput(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localRangeToIso(date: string, startTime: string, endTime: string) {
  const from = new Date(`${date}T${startTime}:00`);
  const to = new Date(`${date}T${endTime}:00`);
  return { from: from.toISOString(), to: to.toISOString() };
}

export default function MapPage() {
  const [tab, setTab] = useState<"live" | "history">("live");
  const [locations, setLocations] = useState<LiveLoc[]>([]);
  const [q, setQ] = useState("");
  const [presence, setPresence] = useState<Presence>("all");
  const [mode, setMode] = useState<"ws" | "poll">("ws");
  const [error, setError] = useState<string | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);

  // History state
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(toLocalDateInput());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [historyMeta, setHistoryMeta] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);

  const poll = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("presence", presence);
    const qs = params.toString();
    const data = await api<{ locations: LiveLoc[] }>(
      `/v1/admin/live-map?${qs}`,
    );
    setLocations(data.locations);
  }, [q, presence]);

  useEffect(() => {
    if (tab !== "live") return;

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startPoll = () => {
      if (cancelled) return;
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
          payload?: Partial<LiveLoc> & {
            employeeId: string;
            isClockedIn?: boolean;
          };
        };
        if (msg.type === "location.update" && msg.payload) {
          const clockedIn = msg.payload.isClockedIn !== false;
          setLocations((prev) => {
            const idx = prev.findIndex(
              (p) => p.employeeId === msg.payload!.employeeId,
            );
            const next: LiveLoc = {
              employeeId: msg.payload!.employeeId,
              name: prev[idx]?.name ?? "Employee",
              role: prev[idx]?.role ?? "employee",
              jobTitle: prev[idx]?.jobTitle ?? null,
              lat: msg.payload!.lat ?? 0,
              lng: msg.payload!.lng ?? 0,
              secondsSinceUpdate: 0,
              isClockedIn: clockedIn,
            };

            // Apply presence filter client-side for WS updates
            const passes =
              presence === "all" ||
              (presence === "on_shift" && clockedIn) ||
              (presence === "last_seen" && !clockedIn);

            if (!passes) {
              if (idx >= 0) {
                const copy = [...prev];
                copy.splice(idx, 1);
                return copy;
              }
              return prev;
            }

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
      cancelled = true;
      ws?.close();
      if (pollTimer) clearInterval(pollTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [tab, q, presence, poll]);

  useEffect(() => {
    if (tab !== "history") return;
    void api<{ employees: Array<EmployeeOpt & { role?: string }> }>(
      "/v1/employees",
    )
      .then((data) => {
        const fieldStaff = data.employees.filter(
          (e) => !e.role || e.role === "employee",
        );
        setEmployees(
          fieldStaff.map((e) => ({
            id: e.id,
            name: e.name,
            jobTitle: e.jobTitle,
          })),
        );
        if (!employeeId && fieldStaff[0]) {
          setEmployeeId(fieldStaff[0].id);
        }
      })
      .catch((e) => setError(e.message));
  }, [tab]);

  useEffect(() => {
    if (tab !== "history" || !employeeId || !date) {
      setSessions([]);
      return;
    }
    void api<{ sessions: Session[] }>(
      `/v1/admin/location-sessions?employeeId=${encodeURIComponent(employeeId)}&date=${encodeURIComponent(date)}`,
    )
      .then((data) => setSessions(data.sessions))
      .catch(() => setSessions([]));
  }, [tab, employeeId, date]);

  async function loadHistory(range?: { from: string; to: string }) {
    if (!employeeId) {
      setError("Select an employee");
      return;
    }
    setHistoryBusy(true);
    setError(null);
    setHistoryMeta(null);
    try {
      const { from, to } =
        range ?? localRangeToIso(date, startTime, endTime);
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (toDate.getTime() < fromDate.getTime()) {
        throw new Error("End time must be after start time");
      }
      if (toDate.getTime() - fromDate.getTime() > 24 * 60 * 60 * 1000) {
        throw new Error("Range must be at most 24 hours");
      }
      const data = await api<{
        points: HistoryPoint[];
        pointCount: number;
        retentionDays: number;
        employee: { name: string };
      }>(
        `/v1/admin/location-history?employeeId=${encodeURIComponent(employeeId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      setHistoryPoints(data.points);
      setScrubIndex(data.points.length ? data.points.length - 1 : 0);
      setHistoryMeta(
        data.pointCount === 0
          ? `No saved locations in this range (retention ${data.retentionDays} days).`
          : `${data.employee.name}: ${data.pointCount} point(s)`,
      );
      setStartTime(toLocalTimeInput(fromDate));
      setEndTime(toLocalTimeInput(toDate));
    } catch (e) {
      setHistoryPoints([]);
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setHistoryBusy(false);
    }
  }

  const focusPoint = useMemo(() => {
    if (!historyPoints.length) return null;
    return historyPoints[Math.min(scrubIndex, historyPoints.length - 1)] ?? null;
  }, [historyPoints, scrubIndex]);

  useEffect(() => {
    if (
      selectedLiveId &&
      !locations.some((l) => l.employeeId === selectedLiveId)
    ) {
      setSelectedLiveId(null);
    }
  }, [locations, selectedLiveId]);

  const visibleLocations = useMemo(() => {
    if (tab !== "live") return [];
    if (!selectedLiveId) return locations;
    return locations.filter((l) => l.employeeId === selectedLiveId);
  }, [tab, locations, selectedLiveId]);

  const center = useMemo(() => {
    if (tab === "history" && focusPoint) {
      return { lat: focusPoint.lat, lng: focusPoint.lng };
    }
    if (visibleLocations.length) {
      return { lat: visibleLocations[0]!.lat, lng: visibleLocations[0]!.lng };
    }
    if (locations.length) {
      return { lat: locations[0]!.lat, lng: locations[0]!.lng };
    }
    return { lat: 30.0444, lng: 31.2357 };
  }, [tab, focusPoint, visibleLocations, locations]);

  const mapFocusKey = useMemo(() => {
    if (tab === "live" && selectedLiveId) {
      const loc = visibleLocations[0];
      return loc
        ? `live:${selectedLiveId}:${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`
        : `live:${selectedLiveId}`;
    }
    if (tab === "live") {
      return `all:${locations.map((l) => l.employeeId).join(",")}`;
    }
    return `hist:${historyPoints.length}:${focusPoint?.recordedAt ?? ""}`;
  }, [tab, selectedLiveId, visibleLocations, locations, historyPoints.length, focusPoint]);

  function applySession(s: Session) {
    const inAt = new Date(s.clockInAt);
    const outAt = s.clockOutAt ? new Date(s.clockOutAt) : new Date();
    setDate(toLocalDateInput(inAt));
    setStartTime(toLocalTimeInput(inAt));
    setEndTime(toLocalTimeInput(outAt));
    void loadHistory({
      from: inAt.toISOString(),
      to: outAt.toISOString(),
    });
  }

  function onScrubChange(value: number) {
    if (!historyPoints.length) return;
    // value is ms along the range; snap to nearest real ping
    const nearest = nearestPoint(historyPoints, value);
    if (!nearest) return;
    const idx = historyPoints.findIndex(
      (p) => p.recordedAt === nearest.recordedAt,
    );
    setScrubIndex(idx >= 0 ? idx : 0);
  }

  const scrubMin = historyPoints[0]
    ? new Date(historyPoints[0].recordedAt).getTime()
    : 0;
  const scrubMax = historyPoints.length
    ? new Date(historyPoints[historyPoints.length - 1]!.recordedAt).getTime()
    : 0;
  const scrubValue = focusPoint
    ? new Date(focusPoint.recordedAt).getTime()
    : scrubMin;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Live map</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "live"
              ? `Mode: ${mode === "ws" ? "realtime" : "REST polling fallback"}`
              : "Review saved locations by employee and time"}
          </p>
        </div>
        <div className="inline-flex rounded-md border bg-white/70 p-1">
          <button
            type="button"
            className={cn(
              "rounded px-3 py-1.5 text-sm",
              tab === "live" ? "bg-primary text-primary-foreground" : "",
            )}
            onClick={() => {
              setSelectedLiveId(null);
              setTab("live");
            }}
          >
            Live
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-3 py-1.5 text-sm",
              tab === "history" ? "bg-primary text-primary-foreground" : "",
            )}
            onClick={() => {
              setSelectedLiveId(null);
              setTab("history");
            }}
          >
            History
          </button>
        </div>
      </div>

      {tab === "live" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label className="text-xs">Filter</Label>
            <Input
              placeholder="Name or title…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="text-xs">Presence</Label>
            <select
              className="flex h-10 w-36 rounded-md border border-input bg-background px-3 text-sm"
              value={presence}
              onChange={(e) => setPresence(e.target.value as Presence)}
            >
              <option value="all">All</option>
              <option value="on_shift">On shift</option>
              <option value="last_seen">Last seen</option>
            </select>
          </div>
          <Button variant="outline" onClick={() => void poll()}>
            Refresh
          </Button>
          {selectedLiveId ? (
            <Button
              variant="outline"
              onClick={() => setSelectedLiveId(null)}
            >
              Show all
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border bg-white/70 p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs">Employee</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Day</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-32"
              />
            </div>
            <Button
              disabled={historyBusy}
              onClick={() => void loadHistory()}
            >
              {historyBusy ? "Loading…" : "Show"}
            </Button>
          </div>
          {sessions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">
                Shifts:
              </span>
              {sessions.map((s) => {
                const label = `${toLocalTimeInput(new Date(s.clockInAt))}–${
                  s.clockOutAt
                    ? toLocalTimeInput(new Date(s.clockOutAt))
                    : "now"
                }`;
                return (
                  <Button
                    key={s.id}
                    size="sm"
                    variant="outline"
                    onClick={() => applySession(s)}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          ) : employeeId ? (
            <p className="text-xs text-muted-foreground">
              No clock sessions on this day — use a custom time range.
            </p>
          ) : null}
          {historyMeta ? (
            <p className="text-sm text-muted-foreground">{historyMeta}</p>
          ) : null}
          {historyPoints.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">
                Scrub time · recorded{" "}
                {focusPoint
                  ? new Date(focusPoint.recordedAt).toLocaleString()
                  : "—"}
              </Label>
              <input
                type="range"
                className="w-full"
                min={scrubMin}
                max={scrubMax}
                step={1000}
                value={scrubValue}
                onChange={(e) => onScrubChange(Number(e.target.value))}
              />
            </div>
          ) : null}
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="h-[60vh] overflow-hidden rounded-lg border">
        <LiveMap
          center={center}
          locations={tab === "live" ? visibleLocations : []}
          historyPoints={tab === "history" ? historyPoints : undefined}
          focusPoint={tab === "history" ? focusPoint : null}
          mode={tab}
          focusKey={mapFocusKey}
        />
      </div>

      {tab === "live" ? (
        <ul className="space-y-2 text-sm">
          {locations.map((l) => {
            const selected = selectedLiveId === l.employeeId;
            return (
              <li key={l.employeeId}>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedLiveId((prev) =>
                      prev === l.employeeId ? null : l.employeeId,
                    )
                  }
                  className={cn(
                    "w-full rounded-md border px-3 py-2 text-left transition-colors",
                    selected
                      ? "border-primary bg-primary/10"
                      : "bg-white/70 hover:bg-secondary/60",
                  )}
                >
                  <span className="font-medium">{l.name}</span> ·{" "}
                  {l.jobTitle ?? l.role} ·{" "}
                  {l.isClockedIn === false ? (
                    <span className="text-muted-foreground">Last seen</span>
                  ) : (
                    <span className="text-teal-800">On shift</span>
                  )}{" "}
                  · updated {l.secondsSinceUpdate ?? 0}s ago
                  {selected ? (
                    <span className="ml-2 text-xs text-primary">· focused</span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {!locations.length ? (
            <li className="text-muted-foreground">No locations to show.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
