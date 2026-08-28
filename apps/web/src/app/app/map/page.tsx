"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, getTokens, wsUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import type { HistoryPoint, LiveLoc, MapAppearance } from "@/components/live-map";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  DEFAULT_MAP_APPEARANCE,
  MAP_MARKER_STYLES,
  MAP_THEMES,
  MAP_TILE_STYLES,
  MAX_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  type MapThemeId,
} from "@hr/shared";
import { Building2, MapPin, Palette, RotateCcw, Search, Settings2 } from "lucide-react";

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

const TILE_LABELS: Record<(typeof MAP_TILE_STYLES)[number], string> = {
  voyager: "Voyager (colorful)",
  positron: "Positron (light)",
  osm: "OpenStreetMap",
  dark: "Dark",
};

const MARKER_LABELS: Record<(typeof MAP_MARKER_STYLES)[number], string> = {
  pulse: "Pulse",
  soft: "Soft blob",
  pin: "Pin",
};

const TILE_SWATCH: Record<(typeof MAP_TILE_STYLES)[number], string> = {
  voyager: "linear-gradient(135deg, #dbeafe, #bbf7d0 45%, #fde68a)",
  positron: "linear-gradient(135deg, #f8fafc, #e2e8f0)",
  osm: "linear-gradient(135deg, #e8f5e9, #c8e6c9 40%, #fff3e0)",
  dark: "linear-gradient(135deg, #0f172a, #1e293b 50%, #334155)",
};

const PLACE_QUICK_SEARCHES = [
  "hospital",
  "school",
  "clinic",
  "building",
  "mall",
  "office",
] as const;

type PlaceHit = {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  type: string | null;
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

  const [appearance, setAppearance] = useState<MapAppearance>(
    DEFAULT_MAP_APPEARANCE,
  );
  const [draftAppearance, setDraftAppearance] =
    useState<MapAppearance>(DEFAULT_MAP_APPEARANCE);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [zoneRadius, setZoneRadius] = useState(DEFAULT_GEOFENCE_RADIUS_METERS);
  const [zoneLat, setZoneLat] = useState<number | null>(null);
  const [zoneLng, setZoneLng] = useState<number | null>(null);
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const [pickOnMap, setPickOnMap] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeHits, setPlaceHits] = useState<PlaceHit[]>([]);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

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

  useEffect(() => {
    void api<{ map: MapAppearance }>("/v1/admin/map-settings")
      .then((data) => {
        setAppearance(data.map);
        setDraftAppearance(data.map);
      })
      .catch(() => undefined);
  }, []);

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
              geofenceLat: prev[idx]?.geofenceLat ?? null,
              geofenceLng: prev[idx]?.geofenceLng ?? null,
              geofenceRadiusMeters: prev[idx]?.geofenceRadiusMeters ?? null,
            };

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

  useEffect(() => {
    if (!selectedLiveId) {
      setZoneLat(null);
      setZoneLng(null);
      setZoneRadius(DEFAULT_GEOFENCE_RADIUS_METERS);
      setZoneLabel(null);
      setPickOnMap(false);
      setPlaceQuery("");
      setPlaceHits([]);
      setPlaceError(null);
      return;
    }
    const loc = locations.find((l) => l.employeeId === selectedLiveId);
    if (!loc) return;
    const hasRealZone =
      loc.geofenceLat != null &&
      loc.geofenceLng != null &&
      !(loc.geofenceLat === 0 && loc.geofenceLng === 0);
    if (hasRealZone) {
      setZoneLat(loc.geofenceLat!);
      setZoneLng(loc.geofenceLng!);
      setZoneRadius(
        loc.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
      );
      setZoneLabel("Saved work zone");
    } else {
      setZoneLat(loc.lat);
      setZoneLng(loc.lng);
      setZoneRadius(
        loc.geofenceRadiusMeters && !(loc.geofenceLat === 0 && loc.geofenceLng === 0)
          ? loc.geofenceRadiusMeters
          : DEFAULT_GEOFENCE_RADIUS_METERS,
      );
      setZoneLabel("Employee live position");
    }
  }, [selectedLiveId]);

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

  const liveAppearance = customizeOpen ? draftAppearance : appearance;

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
    const nearest = nearestPoint(historyPoints, value);
    if (!nearest) return;
    const idx = historyPoints.findIndex(
      (p) => p.recordedAt === nearest.recordedAt,
    );
    setScrubIndex(idx >= 0 ? idx : 0);
  }

  function applyTheme(themeId: Exclude<MapThemeId, "custom">) {
    const theme = MAP_THEMES.find((t) => t.id === themeId);
    if (!theme) return;
    setDraftAppearance({ ...theme.appearance });
  }

  function patchAppearance(patch: Partial<MapAppearance>) {
    setDraftAppearance((a) => ({
      ...a,
      ...patch,
      themeId: "custom" as MapThemeId,
    }));
  }

  async function saveAppearance() {
    setSettingsBusy(true);
    setSettingsSaved(false);
    setError(null);
    try {
      const data = await api<{ map: MapAppearance }>("/v1/admin/map-settings", {
        method: "PATCH",
        body: JSON.stringify(draftAppearance),
      });
      setAppearance(data.map);
      setDraftAppearance(data.map);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save map style");
    } finally {
      setSettingsBusy(false);
    }
  }

  function resetAppearanceDraft() {
    setDraftAppearance(DEFAULT_MAP_APPEARANCE);
  }

  const selectedLive = useMemo(
    () => locations.find((l) => l.employeeId === selectedLiveId) ?? null,
    [locations, selectedLiveId],
  );

  const draftGeofence =
    selectedLiveId && zoneLat != null && zoneLng != null
      ? {
          employeeId: selectedLiveId,
          lat: zoneLat,
          lng: zoneLng,
          radiusMeters: zoneRadius,
        }
      : null;

  async function saveZone() {
    if (!selectedLiveId || zoneLat == null || zoneLng == null) return;
    if (zoneLat === 0 && zoneLng === 0) {
      setError("Set a real center (use live position) — 0, 0 is not valid");
      return;
    }
    const radius = Math.min(
      MAX_GEOFENCE_RADIUS_METERS,
      Math.max(MIN_GEOFENCE_RADIUS_METERS, Math.round(zoneRadius)),
    );
    setZoneBusy(true);
    setError(null);
    try {
      await api(`/v1/employees/${selectedLiveId}`, {
        method: "PATCH",
        body: JSON.stringify({
          geofenceLat: zoneLat,
          geofenceLng: zoneLng,
          geofenceRadiusMeters: radius,
        }),
      });
      setLocations((prev) =>
        prev.map((l) =>
          l.employeeId === selectedLiveId
            ? {
                ...l,
                geofenceLat: zoneLat,
                geofenceLng: zoneLng,
                geofenceRadiusMeters: radius,
              }
            : l,
        ),
      );
      setZoneRadius(radius);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save zone");
    } finally {
      setZoneBusy(false);
    }
  }

  async function clearZone() {
    if (!selectedLiveId) return;
    setZoneBusy(true);
    setError(null);
    try {
      await api(`/v1/employees/${selectedLiveId}`, {
        method: "PATCH",
        body: JSON.stringify({
          geofenceLat: null,
          geofenceLng: null,
          geofenceRadiusMeters: null,
        }),
      });
      setLocations((prev) =>
        prev.map((l) =>
          l.employeeId === selectedLiveId
            ? {
                ...l,
                geofenceLat: null,
                geofenceLng: null,
                geofenceRadiusMeters: null,
              }
            : l,
        ),
      );
      if (selectedLive) {
        setZoneLat(selectedLive.lat);
        setZoneLng(selectedLive.lng);
      }
      setZoneRadius(DEFAULT_GEOFENCE_RADIUS_METERS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear zone");
    } finally {
      setZoneBusy(false);
    }
  }

  function useCurrentAsCenter() {
    if (!selectedLive) return;
    setZoneLat(selectedLive.lat);
    setZoneLng(selectedLive.lng);
    setZoneLabel("Employee live position");
    setPickOnMap(false);
  }

  function onPickCenter(lat: number, lng: number) {
    setZoneLat(lat);
    setZoneLng(lng);
    setZoneLabel("Picked on map");
    setPickOnMap(false);
    setPlaceHits([]);
  }

  async function searchPlaces(rawQuery?: string) {
    const q = (rawQuery ?? placeQuery).trim();
    if (q.length < 2) {
      setPlaceError("Type at least 2 characters");
      return;
    }
    setPlaceBusy(true);
    setPlaceError(null);
    try {
      const params = new URLSearchParams({
        q,
        limit: "8",
      });
      const near = selectedLive ?? (zoneLat != null && zoneLng != null
        ? { lat: zoneLat, lng: zoneLng }
        : null);
      if (near) {
        params.set("nearLat", String(near.lat));
        params.set("nearLng", String(near.lng));
      }
      const data = await api<{ places: PlaceHit[] }>(
        `/v1/admin/places/search?${params.toString()}`,
      );
      setPlaceHits(data.places);
      if (!data.places.length) {
        setPlaceError("No places found — try a more specific name or city");
      }
    } catch (e) {
      setPlaceHits([]);
      setPlaceError(e instanceof Error ? e.message : "Place search failed");
    } finally {
      setPlaceBusy(false);
    }
  }

  function applyPlace(place: PlaceHit) {
    setZoneLat(place.lat);
    setZoneLng(place.lng);
    setZoneLabel(place.name);
    setPlaceQuery(place.name);
    setPlaceHits([]);
    setPickOnMap(false);
    setPlaceError(null);
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
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={customizeOpen ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setDraftAppearance(appearance);
              setCustomizeOpen((o) => !o);
            }}
          >
            <Palette className="h-4 w-4" />
            Customize
          </Button>
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
      </div>

      {customizeOpen ? (
        <div className="space-y-4 rounded-xl border bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4 text-primary" />
            Map themes
            <span className="font-normal text-muted-foreground">
              · pick a theme to preview · save to keep for your organization
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {MAP_THEMES.map((theme) => {
              const selected = draftAppearance.themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => applyTheme(theme.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : "border-border bg-white/70 hover:border-primary/40 hover:bg-secondary/40",
                  )}
                >
                  <div
                    className="mb-2 h-14 overflow-hidden rounded-lg border border-black/5"
                    style={{ background: TILE_SWATCH[theme.appearance.tileStyle] }}
                  >
                    <div className="flex h-full items-end justify-center gap-2 pb-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                        style={{ background: theme.appearance.onShiftColor }}
                      />
                      <span
                        className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                        style={{ background: theme.appearance.lastSeenColor }}
                      />
                      <span
                        className="mb-0.5 h-1 w-8 rounded-full opacity-80"
                        style={{ background: theme.appearance.trailColor }}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{theme.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {theme.description}
                  </p>
                </button>
              );
            })}
          </div>

          {draftAppearance.themeId === "custom" ? (
            <p className="text-xs text-muted-foreground">
              Custom theme — advanced options below override the presets.
            </p>
          ) : null}

          <details className="rounded-lg border bg-white/60 p-3">
            <summary className="cursor-pointer text-sm font-medium">
              Advanced options
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Map style</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draftAppearance.tileStyle}
                  onChange={(e) =>
                    patchAppearance({
                      tileStyle: e.target
                        .value as MapAppearance["tileStyle"],
                    })
                  }
                >
                  {MAP_TILE_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {TILE_LABELS[style]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Marker style</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draftAppearance.markerStyle}
                  onChange={(e) =>
                    patchAppearance({
                      markerStyle: e.target
                        .value as MapAppearance["markerStyle"],
                    })
                  }
                >
                  {MAP_MARKER_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {MARKER_LABELS[style]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={draftAppearance.showInitials}
                    onChange={(e) =>
                      patchAppearance({ showInitials: e.target.checked })
                    }
                  />
                  Show initials on markers
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">On-shift color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border bg-background p-1"
                    value={draftAppearance.onShiftColor}
                    onChange={(e) =>
                      patchAppearance({ onShiftColor: e.target.value })
                    }
                  />
                  <Input
                    value={draftAppearance.onShiftColor}
                    onChange={(e) =>
                      patchAppearance({ onShiftColor: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last-seen color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border bg-background p-1"
                    value={draftAppearance.lastSeenColor}
                    onChange={(e) =>
                      patchAppearance({ lastSeenColor: e.target.value })
                    }
                  />
                  <Input
                    value={draftAppearance.lastSeenColor}
                    onChange={(e) =>
                      patchAppearance({ lastSeenColor: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">History trail color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-10 w-12 cursor-pointer rounded border bg-background p-1"
                    value={draftAppearance.trailColor}
                    onChange={(e) =>
                      patchAppearance({ trailColor: e.target.value })
                    }
                  />
                  <Input
                    value={draftAppearance.trailColor}
                    onChange={(e) =>
                      patchAppearance({ trailColor: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </details>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={settingsBusy}
              onClick={() => void saveAppearance()}
            >
              {settingsBusy ? "Saving…" : "Save for organization"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetAppearanceDraft}
            >
              <RotateCcw className="h-4 w-4" />
              Reset defaults
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftAppearance(appearance);
                setCustomizeOpen(false);
              }}
            >
              Close
            </Button>
            {settingsSaved ? (
              <span className="self-center text-sm text-teal-700">
                Saved
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

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

      <div className="h-[60vh] overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5">
        <LiveMap
          center={center}
          locations={tab === "live" ? visibleLocations : []}
          historyPoints={tab === "history" ? historyPoints : undefined}
          focusPoint={tab === "history" ? focusPoint : null}
          mode={tab}
          focusKey={mapFocusKey}
          appearance={liveAppearance}
          selectedId={selectedLiveId}
          draftGeofence={tab === "live" ? draftGeofence : null}
          pickCenterEnabled={tab === "live" && !!selectedLiveId && pickOnMap}
          onPickCenter={onPickCenter}
        />
      </div>

      {tab === "live" && selectedLive ? (
        <div className="space-y-3 rounded-xl border bg-white/80 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              Work zone · {selectedLive.name}
            </div>
            <p className="text-xs text-muted-foreground">
              Search a place, click the map, or use live position
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Find a place</Label>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[14rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Hospital, school, building name…"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void searchPlaces();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={placeBusy}
                onClick={() => void searchPlaces()}
              >
                {placeBusy ? "Searching…" : "Search"}
              </Button>
              <Button
                type="button"
                variant={pickOnMap ? "default" : "outline"}
                onClick={() => setPickOnMap((v) => !v)}
              >
                <Building2 className="h-4 w-4" />
                {pickOnMap ? "Click map…" : "Pick on map"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACE_QUICK_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="rounded-full border bg-white px-2.5 py-1 text-xs capitalize text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  onClick={() => {
                    setPlaceQuery(term);
                    void searchPlaces(term);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
            {placeError ? (
              <p className="text-xs text-destructive">{placeError}</p>
            ) : null}
            {placeHits.length > 0 ? (
              <ul className="max-h-44 overflow-auto rounded-lg border bg-white">
                {placeHits.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className="w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-secondary/50"
                      onClick={() => applyPlace(place)}
                    >
                      <p className="text-sm font-medium">{place.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {place.label}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {zoneLabel ? (
              <p className="text-xs text-muted-foreground">
                Center · <span className="font-medium text-foreground">{zoneLabel}</span>
                {zoneLat != null && zoneLng != null
                  ? ` · ${zoneLat.toFixed(5)}, ${zoneLng.toFixed(5)}`
                  : null}
              </p>
            ) : null}
            {pickOnMap ? (
              <p className="text-xs text-amber-700">
                Click anywhere on the map to set the zone center.
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                Radius · {zoneRadius}m (
                {(zoneRadius / 1000).toFixed(zoneRadius >= 1000 ? 2 : 3)} km)
              </Label>
              <input
                type="range"
                className="w-full"
                min={MIN_GEOFENCE_RADIUS_METERS}
                max={Math.min(MAX_GEOFENCE_RADIUS_METERS, 5000)}
                step={10}
                value={Math.min(zoneRadius, 5000)}
                onChange={(e) => setZoneRadius(Number(e.target.value))}
              />
              <Input
                type="number"
                min={MIN_GEOFENCE_RADIUS_METERS}
                max={MAX_GEOFENCE_RADIUS_METERS}
                value={zoneRadius}
                onChange={(e) => setZoneRadius(Number(e.target.value) || 0)}
                className="mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Center lat</Label>
              <Input
                type="number"
                step="0.0001"
                value={zoneLat ?? ""}
                onChange={(e) => {
                  setZoneLat(
                    e.target.value === "" ? null : Number(e.target.value),
                  );
                  setZoneLabel("Custom coordinates");
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Center lng</Label>
              <Input
                type="number"
                step="0.0001"
                value={zoneLng ?? ""}
                onChange={(e) => {
                  setZoneLng(
                    e.target.value === "" ? null : Number(e.target.value),
                  );
                  setZoneLabel("Custom coordinates");
                }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={zoneBusy || zoneLat == null || zoneLng == null}
              onClick={() => void saveZone()}
            >
              {zoneBusy ? "Saving…" : "Save zone"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedLive}
              onClick={useCurrentAsCenter}
            >
              Use live position as center
            </Button>
            {selectedLive.geofenceRadiusMeters != null ? (
              <Button
                type="button"
                variant="ghost"
                disabled={zoneBusy}
                onClick={() => void clearZone()}
              >
                Clear zone
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

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
                    "w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "bg-white/70 hover:bg-secondary/60",
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <UserAvatar name={l.name} avatarUrl={l.avatarUrl} size="sm" />
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        background:
                          l.isClockedIn === false
                            ? liveAppearance.lastSeenColor
                            : liveAppearance.onShiftColor,
                      }}
                    />
                    <span className="font-medium">{l.name}</span>
                  </span>{" "}
                  · {l.jobTitle ?? l.role} ·{" "}
                  {l.isClockedIn === false ? (
                    <span className="text-muted-foreground">Last seen</span>
                  ) : (
                    <span className="text-teal-800">On shift</span>
                  )}{" "}
                  · updated {l.secondsSinceUpdate ?? 0}s ago
                  {l.geofenceRadiusMeters != null ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      · zone {l.geofenceRadiusMeters}m
                    </span>
                  ) : null}
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
