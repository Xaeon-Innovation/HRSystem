"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { api, getTokens, wsUrl, wsSendAuth } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import type { HistoryPoint, LiveLoc, MapAppearance } from "@/components/live-map";
import { MapPaneFallback } from "@/components/map-pane-fallback";
import { estimateMapZoom, filterLiveLocations } from "@/lib/map-view";
import "leaflet/dist/leaflet.css";
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
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import { t } from "@/i18n";

const LiveMap = dynamic(() => import("@/components/live-map"), {
  ssr: false,
  loading: () => <MapPaneFallback />,
});

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
  voyager: t("Voyager (colorful)"),
  positron: t("Positron (light)"),
  osm: "OpenStreetMap",
  dark: "Dark",
};

const MARKER_LABELS: Record<(typeof MAP_MARKER_STYLES)[number], string> = {
  pulse: "Pulse",
  soft: t("Soft blob"),
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
  const redesign = useUiRedesign();
  const [tab, setTab] = useState<"live" | "history">("live");
  const [locations, setLocations] = useState<LiveLoc[]>([]);
  const [q, setQ] = useState("");
  const [presence, setPresence] = useState<Presence>("all");
  const [mode, setMode] = useState<"ws" | "poll">("ws");
  const [error, setError] = useState<string | null>(null);
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null);
  const [settingsReady, setSettingsReady] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const [mapBooted, setMapBooted] = useState(false);

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
    void import("@/components/live-map");
  }, []);

  useEffect(() => {
    void api<{ map: MapAppearance }>("/v1/admin/map-settings")
      .then((data) => {
        setAppearance(data.map);
        setDraftAppearance(data.map);
      })
      .catch(() => undefined)
      .finally(() => setSettingsReady(true));
  }, []);

  useEffect(() => {
    if (mapBooted) return;
    if (!settingsReady) return;
    if (tab === "live" && !liveReady) return;
    setMapBooted(true);
  }, [mapBooted, settingsReady, liveReady, tab]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSettingsReady(true);
      setLiveReady(true);
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  const poll = useCallback(async (opts?: { skipCache?: boolean }) => {
    const params = new URLSearchParams();
    params.set("presence", presence);
    const qs = params.toString();
    const data = await api<{ locations: LiveLoc[] }>(
      `/v1/admin/live-map?${qs}`,
      { skipCache: opts?.skipCache ?? true },
    );
    setLocations(data.locations);
    setLiveReady(true);
  }, [presence]);

  useEffect(() => {
    if (tab !== "live") return;

    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const startPoll = () => {
      if (cancelled) return;
      setMode("poll");
      void poll({ skipCache: true }).catch((e) => setError(e.message));
      pollTimer = setInterval(() => {
        void poll({ skipCache: true }).catch(() => undefined);
      }, 5000);
    };

    void poll({ skipCache: false }).catch((e) => {
      setLiveReady(true);
      setError(e.message);
    });

    const { access } = getTokens();
    if (!access) {
      startPoll();
      return;
    }

    try {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => {
        wsSendAuth(ws!, access);
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as {
          type: string;
          payload?: Partial<LiveLoc> & {
            employeeId: string;
            isClockedIn?: boolean;
          };
        };
        if (msg.type === "auth.ok") {
          setMode("ws");
          ws?.send(JSON.stringify({ type: "subscribe.map" }));
          if (fallbackTimer) clearTimeout(fallbackTimer);
          return;
        }
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
  }, [tab, presence, poll]);

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
      { skipCache: true },
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
        { skipCache: true },
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

  const searchedLocations = useMemo(
    () => filterLiveLocations(locations, q),
    [locations, q],
  );

  const visibleLocations = useMemo(() => {
    if (tab !== "live") return [];
    if (selectedLiveId) {
      return locations.filter((l) => l.employeeId === selectedLiveId);
    }
    return searchedLocations;
  }, [tab, locations, searchedLocations, selectedLiveId]);

  const center = useMemo(() => {
    if (tab === "history" && focusPoint) {
      return { lat: focusPoint.lat, lng: focusPoint.lng };
    }
    if (visibleLocations.length) {
      return { lat: visibleLocations[0]!.lat, lng: visibleLocations[0]!.lng };
    }
    if (searchedLocations.length) {
      return { lat: searchedLocations[0]!.lat, lng: searchedLocations[0]!.lng };
    }
    if (locations.length) {
      return { lat: locations[0]!.lat, lng: locations[0]!.lng };
    }
    return { lat: 30.0444, lng: 31.2357 };
  }, [tab, focusPoint, visibleLocations, searchedLocations, locations]);

  const mapZoom = useMemo(() => {
    if (tab === "history") {
      return estimateMapZoom(
        historyPoints.map((p) => [p.lat, p.lng] as [number, number]),
      );
    }
    return estimateMapZoom(
      visibleLocations.map((l) => [l.lat, l.lng] as [number, number]),
    );
  }, [tab, historyPoints, visibleLocations]);

  const mapFocusKey = useMemo(() => {
    if (tab === "live" && selectedLiveId) {
      const loc = visibleLocations[0];
      return loc
        ? `live:${selectedLiveId}:${loc.lat.toFixed(5)},${loc.lng.toFixed(5)}`
        : `live:${selectedLiveId}`;
    }
    if (tab === "live") {
      return `all:${searchedLocations.map((l) => l.employeeId).join(",")}`;
    }
    return `hist:${historyPoints.length}:${focusPoint?.recordedAt ?? ""}`;
  }, [tab, selectedLiveId, visibleLocations, searchedLocations, historyPoints.length, focusPoint]);

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
      setError("Set a real center (use live position), 0, 0 is not valid");
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
        { skipCache: true },
      );
      setPlaceHits(data.places);
      if (!data.places.length) {
        setPlaceError("No places found, try a more specific name or city");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Live map")}</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "live"
              ? `Mode: ${mode === "ws" ? "realtime" : t("REST polling fallback")}`
              : t("Review saved locations by employee and time")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            variant={customizeOpen ? "default" : "outline"}
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => {
              setDraftAppearance(appearance);
              setCustomizeOpen((o) => !o);
            }}
          >
            <Palette className="h-4 w-4" />
            {t("Customize")}</Button>
          <div className="inline-flex w-full rounded-md border bg-card p-1 sm:w-auto">
            <button
              type="button"
              className={cn(
                "flex-1 rounded px-3 py-2 text-sm sm:flex-none sm:py-1.5",
                tab === "live" ? "bg-primary text-primary-foreground" : "",
              )}
              onClick={() => {
                setSelectedLiveId(null);
                setTab("live");
              }}
            >
              {t("Live")}</button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded px-3 py-2 text-sm sm:flex-none sm:py-1.5",
                tab === "history" ? "bg-primary text-primary-foreground" : "",
              )}
              onClick={() => {
                setSelectedLiveId(null);
                setTab("history");
              }}
            >
              {t("History")}</button>
          </div>
        </div>
      </div>

      {customizeOpen && redesign ? (
        <Sheet
          open={customizeOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDraftAppearance(appearance);
              setCustomizeOpen(false);
            }
          }}
        >
          <SheetContent className="flex w-full flex-col sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{t("Map appearance")}</SheetTitle>
              <SheetDescription>
                {t("Pick a theme to preview, then save for your organization.")}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
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
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <div
                        className="mb-2 h-12 overflow-hidden rounded-lg border border-black/5"
                        style={{
                          background: TILE_SWATCH[theme.appearance.tileStyle],
                        }}
                      />
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
                  {t("Custom theme, advanced options below override the presets.")}</p>
              ) : null}
              <details className="rounded-lg border bg-card p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {t("Advanced options")}</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t("Map style")}</Label>
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
                    <Label className="text-xs">{t("Marker style")}</Label>
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
                  <div className="flex items-end gap-2 pb-1 sm:col-span-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={draftAppearance.showInitials}
                        onChange={(e) =>
                          patchAppearance({ showInitials: e.target.checked })
                        }
                      />
                      {t("Show initials on markers")}</label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("On-shift color")}</Label>
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
                    <Label className="text-xs">{t("Last-seen color")}</Label>
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
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">{t("History trail color")}</Label>
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
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  className="w-full"
                  disabled={settingsBusy}
                  onClick={() => void saveAppearance()}
                >
                  {settingsBusy ? t("Saving…") : t("Save for organization")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resetAppearanceDraft}
                >
                  <RotateCcw className="h-4 w-4" />
                  {t("Reset defaults")}</Button>
                {settingsSaved ? (
                  <p className="text-center text-sm text-teal-700 dark:text-teal-400">
                    {t("Saved")}</p>
                ) : null}
              </div>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ) : null}

      {customizeOpen && !redesign ? (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Settings2 className="h-4 w-4 text-primary" />
            {t("Map themes")}<span className="font-normal text-muted-foreground">
              {t("· pick a theme to preview · save to keep for your organization")}</span>
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
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
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
              {t("Custom theme, advanced options below override the presets.")}</p>
          ) : null}

          <details className="rounded-lg border bg-card p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("Advanced options")}</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("Map style")}</Label>
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
                <Label className="text-xs">{t("Marker style")}</Label>
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
                  {t("Show initials on markers")}</label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("On-shift color")}</Label>
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
                <Label className="text-xs">{t("Last-seen color")}</Label>
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
                <Label className="text-xs">{t("History trail color")}</Label>
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
              {settingsBusy ? t("Saving…") : t("Save for organization")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetAppearanceDraft}
            >
              <RotateCcw className="h-4 w-4" />
              {t("Reset defaults")}</Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDraftAppearance(appearance);
                setCustomizeOpen(false);
              }}
            >
              {t("Close")}</Button>
            {settingsSaved ? (
              <span className="self-center text-sm text-teal-700">
                {t("Saved")}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "live" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 w-full sm:w-auto">
            <Label className="text-xs">{t("Filter")}</Label>
            <Input
              placeholder={t("Name or title…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          <div className="min-w-0 w-full sm:w-auto">
            <Label className="text-xs">{t("Presence")}</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-36"
              value={presence}
              onChange={(e) => setPresence(e.target.value as Presence)}
            >
              <option value="all">{t("All")}</option>
              <option value="on_shift">{t("On shift")}</option>
              <option value="last_seen">{t("Last seen")}</option>
            </select>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => void poll()}
          >
            {t("Refresh")}</Button>
          {selectedLiveId ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setSelectedLiveId(null)}
            >
              {t("Show all")}</Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border bg-card p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label className="text-xs">{t("Employee")}</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">{t("Select…")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.jobTitle ? ` · ${e.jobTitle}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">{t("Day")}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <Label className="text-xs">{t("From")}</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-32"
              />
            </div>
            <div>
              <Label className="text-xs">{t("To")}</Label>
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
              {historyBusy ? t("Loading…") : t("Show")}
            </Button>
          </div>
          {sessions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">
                {t("Shifts:")}</span>
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
              {t("No clock sessions on this day, use a custom time range.")}</p>
          ) : null}
          {historyMeta ? (
            <p className="text-sm text-muted-foreground">{historyMeta}</p>
          ) : null}
          {historyPoints.length > 0 ? (
            <div className="space-y-1">
              <Label className="text-xs">
                {t("Scrub time · recorded")}{" "}
                {focusPoint
                  ? new Date(focusPoint.recordedAt).toLocaleString()
                  : "-"}
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

      <div className="relative h-[60vh] overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5">
        {mapBooted ? (
          <LiveMap
            center={center}
            zoom={mapZoom}
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
        ) : (
          <MapPaneFallback />
        )}
      </div>

      {tab === "live" && selectedLive ? (
        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              {t("Work zone ·")}{selectedLive.name}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Search a place, click the map, or use live position")}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Find a place")}</Label>
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[14rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("Hospital, school, building name…")}
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === t("Enter")) {
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
                {placeBusy ? t("Searching…") : t("Search")}
              </Button>
              <Button
                type="button"
                variant={pickOnMap ? "default" : "outline"}
                onClick={() => setPickOnMap((v) => !v)}
              >
                <Building2 className="h-4 w-4" />
                {pickOnMap ? t("Click map…") : t("Pick on map")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACE_QUICK_SEARCHES.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="rounded-full border bg-card px-2.5 py-1 text-xs capitalize text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
              <ul className="max-h-44 overflow-auto rounded-lg border bg-card">
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
                {t("Center ·")}<span className="font-medium text-foreground">{zoneLabel}</span>
                {zoneLat != null && zoneLng != null
                  ? ` · ${zoneLat.toFixed(5)}, ${zoneLng.toFixed(5)}`
                  : null}
              </p>
            ) : null}
            {pickOnMap ? (
              <p className="text-xs text-amber-700">
                {t("Click anywhere on the map to set the zone center.")}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                {t("Radius ·")}{zoneRadius}{t("m (")}{(zoneRadius / 1000).toFixed(zoneRadius >= 1000 ? 2 : 3)} {t("km)")}</Label>
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
              <Label className="text-xs">{t("Center lat")}</Label>
              <Input
                type="number"
                step="0.0001"
                value={zoneLat ?? ""}
                onChange={(e) => {
                  setZoneLat(
                    e.target.value === "" ? null : Number(e.target.value),
                  );
                  setZoneLabel(t("Custom coordinates"));
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Center lng")}</Label>
              <Input
                type="number"
                step="0.0001"
                value={zoneLng ?? ""}
                onChange={(e) => {
                  setZoneLng(
                    e.target.value === "" ? null : Number(e.target.value),
                  );
                  setZoneLabel(t("Custom coordinates"));
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
              {zoneBusy ? t("Saving…") : t("Save zone")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!selectedLive}
              onClick={useCurrentAsCenter}
            >
              {t("Use live position as center")}</Button>
            {selectedLive.geofenceRadiusMeters != null ? (
              <Button
                type="button"
                variant="ghost"
                disabled={zoneBusy}
                onClick={() => void clearZone()}
              >
                {t("Clear zone")}</Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "live" ? (
        <ul className="space-y-2 text-sm">
          {searchedLocations.map((l) => {
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
                      : "bg-card hover:bg-secondary/60",
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
                    <span className="text-muted-foreground">{t("Last seen")}</span>
                  ) : (
                    <span className="text-teal-800">{t("On shift")}</span>
                  )}{" "}
                  {t("· updated")}{l.secondsSinceUpdate ?? 0}{t("s ago")}{l.geofenceRadiusMeters != null ? (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {t("· zone")}{l.geofenceRadiusMeters}m
                    </span>
                  ) : null}
                  {selected ? (
                    <span className="ml-2 text-xs text-primary">{t("· focused")}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {!searchedLocations.length ? (
            <li className="text-muted-foreground">{t("No locations to show.")}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
