"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const onShiftIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const lastSeenIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const focusIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#0f766e;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export type LiveLoc = {
  employeeId: string;
  name: string;
  role: string;
  jobTitle: string | null;
  lat: number;
  lng: number;
  secondsSinceUpdate?: number;
  isClockedIn?: boolean;
};

export type HistoryPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
};

const TRAIL_FULL_THRESHOLD = 500;

function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(items[Math.round(i * step)]!);
  }
  return out;
}

function FitBounds({
  positions,
  focusKey,
  singleZoom = 15,
}: {
  positions: Array<[number, number]>;
  focusKey?: string;
  singleZoom?: number;
}) {
  const map = useMap();
  const key =
    focusKey ??
    positions.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|");

  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0]!, singleZoom, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], animate: true });
  }, [map, key, singleZoom]);
  return null;
}

export default function LiveMapView({
  center,
  locations,
  historyPoints,
  focusPoint,
  mode,
  focusKey,
}: {
  center: { lat: number; lng: number };
  locations: LiveLoc[];
  historyPoints?: HistoryPoint[];
  focusPoint?: HistoryPoint | null;
  mode: "live" | "history";
  focusKey?: string;
}) {
  const trailPositions = useMemo(() => {
    if (!historyPoints?.length) return [] as Array<[number, number]>;
    const source =
      historyPoints.length <= TRAIL_FULL_THRESHOLD
        ? historyPoints
        : downsample(historyPoints, TRAIL_FULL_THRESHOLD);
    return source.map((p) => [p.lat, p.lng] as [number, number]);
  }, [historyPoints]);

  const fitPositions = useMemo(() => {
    if (mode === "history") {
      return trailPositions;
    }
    return locations.map((l) => [l.lat, l.lng] as [number, number]);
  }, [mode, locations, trailPositions]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds
        positions={fitPositions}
        focusKey={focusKey}
        singleZoom={mode === "live" && locations.length === 1 ? 16 : 14}
      />
      {mode === "live"
        ? locations.map((l) => (
            <Marker
              key={l.employeeId}
              position={[l.lat, l.lng]}
              icon={l.isClockedIn === false ? lastSeenIcon : onShiftIcon}
              opacity={l.isClockedIn === false ? 0.75 : 1}
            >
              <Popup>
                <strong>{l.name}</strong>
                <br />
                {l.jobTitle ?? l.role}
                <br />
                {l.isClockedIn === false ? "Last seen · clocked out" : "On shift"}
                <br />
                Updated {l.secondsSinceUpdate ?? 0}s ago
              </Popup>
            </Marker>
          ))
        : null}
      {mode === "history" && trailPositions.length > 1 ? (
        <Polyline
          positions={trailPositions}
          pathOptions={{ color: "#0f766e", weight: 3, opacity: 0.7 }}
        />
      ) : null}
      {mode === "history" && focusPoint ? (
        <Marker
          position={[focusPoint.lat, focusPoint.lng]}
          icon={focusIcon}
        >
          <Popup>
            Recorded {new Date(focusPoint.recordedAt).toLocaleString()}
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
