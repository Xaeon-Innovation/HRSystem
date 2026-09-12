"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Polyline,
  Circle,
  useMap,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import {
  DEFAULT_MAP_APPEARANCE,
  type MapAppearance,
  type MapTileStyle,
} from "@hr/shared";
import { mediaUrl } from "@/lib/api";
import "leaflet/dist/leaflet.css";
import { t } from "@/i18n";

export type LiveLoc = {
  employeeId: string;
  name: string;
  role: string;
  jobTitle: string | null;
  lat: number;
  lng: number;
  secondsSinceUpdate?: number;
  isClockedIn?: boolean;
  avatarUrl?: string | null;
  geofenceLat?: number | null;
  geofenceLng?: number | null;
  geofenceRadiusMeters?: number | null;
};

export type HistoryPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
};

export type { MapAppearance };

const MAP_MAX_ZOOM = 19;
const MAP_MIN_ZOOM = 3;

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';
const ESRI_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://www.esri.com/">Esri</a>';

// Keyless tile CDNs only — CARTO watermarks "API key required"; OSM.fr/hot is slow.
const TILE_LAYERS: Record<
  MapTileStyle,
  {
    url: string;
    attribution: string;
    maxZoom: number;
    /** Highest zoom the provider actually serves; Leaflet upscales past it. */
    maxNativeZoom?: number;
    subdomains?: string;
  }
> = {
  voyager: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTRIBUTION,
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 19,
  },
  positron: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTRIBUTION,
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 16,
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png",
    attribution: OSM_ATTRIBUTION,
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 19,
    subdomains: "abc",
  },
  dark: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: ESRI_ATTRIBUTION,
    maxZoom: MAP_MAX_ZOOM,
    maxNativeZoom: 16,
  },
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

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function markerHtml({
  color,
  label,
  style,
  active,
  showInitials,
  photoUrl,
}: {
  color: string;
  label: string;
  style: MapAppearance["markerStyle"];
  active: boolean;
  showInitials: boolean;
  photoUrl?: string | null;
}) {
  const safeLabel = escapeHtml(label);
  const safePhoto = photoUrl ? escapeHtml(photoUrl) : "";
  const faceInner = safePhoto
    ? `<img class="lm-marker-photo" src="${safePhoto}" alt="" />`
    : showInitials
      ? `<span class="lm-marker-initials">${safeLabel}</span>`
      : `<span class="lm-pulse-dot"></span>`;
  const face = `<span class="lm-marker-face">${faceInner}</span>`;
  const statusDot = `<span class="lm-status-dot ${active ? "lm-status-dot--online" : "lm-status-dot--offline"}" aria-hidden="true"></span>`;

  if (style === "pin") {
    return `<div class="lm-marker lm-marker--pin ${active ? "lm-marker--active" : "lm-marker--idle"}" style="--lm-color:${color}">
      <div class="lm-pin-head">${face}${statusDot}</div>
      <div class="lm-pin-point"></div>
      ${active ? `<span class="lm-pulse-ring" aria-hidden="true"></span>` : ""}
    </div>`;
  }

  if (style === "soft") {
    return `<div class="lm-marker lm-marker--soft ${active ? "lm-marker--active" : "lm-marker--idle"}" style="--lm-color:${color}">
      <div class="lm-soft-blob">${face}${statusDot}</div>
      ${active ? `<span class="lm-pulse-ring" aria-hidden="true"></span>` : ""}
    </div>`;
  }

  return `<div class="lm-marker lm-marker--pulse ${active ? "lm-marker--active" : "lm-marker--idle"}" style="--lm-color:${color}">
    <div class="lm-pulse-core">${face}${statusDot}</div>
    ${active ? `<span class="lm-pulse-ring" aria-hidden="true"></span><span class="lm-pulse-ring lm-pulse-ring--delay" aria-hidden="true"></span>` : ""}
  </div>`;
}

function buildIcon(
  appearance: MapAppearance,
  opts: { name: string; active: boolean; focused?: boolean; avatarUrl?: string | null },
) {
  const color = opts.active
    ? appearance.onShiftColor
    : appearance.lastSeenColor;
  const label = initialsOf(opts.name);
  const size =
    appearance.markerStyle === "pin"
      ? ([36, 44] as [number, number])
      : ([40, 40] as [number, number]);
  const anchor =
    appearance.markerStyle === "pin"
      ? ([18, 40] as [number, number])
      : ([20, 20] as [number, number]);

  return L.divIcon({
    className: `lm-icon${opts.focused ? " lm-icon--focused" : ""}`,
    html: markerHtml({
      color,
      label,
      style: appearance.markerStyle,
      active: opts.active,
      showInitials: appearance.showInitials,
      photoUrl: mediaUrl(opts.avatarUrl),
    }),
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, appearance.markerStyle === "pin" ? -36 : -18],
  });
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
  const didFit = useRef(false);
  const key =
    focusKey ??
    positions.map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join("|");

  useEffect(() => {
    if (positions.length === 0) return;
    const first = !didFit.current;
    didFit.current = true;
    if (positions.length === 1) {
      if (first) {
        map.setView(positions[0]!, singleZoom, { animate: false });
      } else {
        map.flyTo(positions[0]!, singleZoom, {
          duration: 0.4,
          easeLinearity: 0.28,
        });
      }
      return;
    }
    const bounds = L.latLngBounds(positions);
    if (first) {
      map.fitBounds(bounds, { padding: [48, 48], animate: false });
    } else {
      map.flyToBounds(bounds, {
        padding: [48, 48],
        duration: 0.4,
        easeLinearity: 0.28,
      });
    }
  }, [map, key, singleZoom]);
  return null;
}

function TilesReadyGate({ onReady }: { onReady: () => void }) {
  const map = useMap();

  useEffect(() => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      onReady();
    };
    map.whenReady(() => {
      map.once("load", settle);
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          layer.once("load", settle);
          // Cached tiles can already be complete when we subscribe.
          const el = (layer as L.TileLayer & { _loading?: boolean })._loading;
          if (el === false) settle();
        }
      });
    });
    const fallback = window.setTimeout(settle, 1800);
    return () => {
      settled = true;
      window.clearTimeout(fallback);
    };
  }, [map, onReady]);

  return null;
}

function MapClickPicker({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !onPick) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onPick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    map.getContainer().style.cursor = "crosshair";
    return () => {
      map.off("click", handler);
      map.getContainer().style.cursor = "";
    };
  }, [map, enabled, onPick]);

  return null;
}

const zoneCenterIcon = L.divIcon({
  className: "lm-icon",
  html: '<div class="lm-zone-center" aria-hidden="true"><span></span></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export default function LiveMapView({
  center,
  zoom = 12,
  locations,
  historyPoints,
  focusPoint,
  mode,
  focusKey,
  appearance = DEFAULT_MAP_APPEARANCE,
  selectedId,
  draftGeofence,
  pickCenterEnabled = false,
  onPickCenter,
}: {
  center: { lat: number; lng: number };
  zoom?: number;
  locations: LiveLoc[];
  historyPoints?: HistoryPoint[];
  focusPoint?: HistoryPoint | null;
  mode: "live" | "history";
  focusKey?: string;
  appearance?: MapAppearance;
  selectedId?: string | null;
  /** Preview zone while editing (overrides saved geofence for selected employee). */
  draftGeofence?: {
    employeeId: string;
    lat: number;
    lng: number;
    radiusMeters: number;
  } | null;
  pickCenterEnabled?: boolean;
  onPickCenter?: (lat: number, lng: number) => void;
}) {
  const tile = TILE_LAYERS[appearance.tileStyle] ?? TILE_LAYERS.voyager;
  const [tilesReady, setTilesReady] = useState(false);
  const onTilesReady = useCallback(() => setTilesReady(true), []);

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
    const points = locations.map((l) => [l.lat, l.lng] as [number, number]);
    // Include geofence center so the circle stays in view when focused
    for (const l of locations) {
      const draft =
        draftGeofence && draftGeofence.employeeId === l.employeeId
          ? draftGeofence
          : null;
      const lat = draft?.lat ?? l.geofenceLat;
      const lng = draft?.lng ?? l.geofenceLng;
      if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
        if (!selectedId || selectedId === l.employeeId) {
          points.push([lat, lng]);
        }
      }
    }
    return points;
  }, [mode, locations, trailPositions, draftGeofence, selectedId]);

  const iconSignature = locations
    .map(
      (l) =>
        `${l.employeeId}:${l.isClockedIn !== false}:${l.avatarUrl ?? ""}:${l.name}`,
    )
    .join("|");

  const liveIcons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const l of locations) {
      map.set(
        l.employeeId,
        buildIcon(appearance, {
          name: l.name,
          active: l.isClockedIn !== false,
          focused: selectedId === l.employeeId,
          avatarUrl: l.avatarUrl,
        }),
      );
    }
    return map;
    // locations is read when iconSignature / appearance / selectedId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iconSignature, appearance, selectedId]);

  const focusMarkerIcon = useMemo(
    () =>
      buildIcon(
        {
          ...appearance,
          onShiftColor: appearance.trailColor,
          showInitials: false,
        },
        { name: "Focus", active: true },
      ),
    [appearance],
  );

  const appearanceKey = [
    appearance.themeId,
    appearance.tileStyle,
    appearance.markerStyle,
    appearance.onShiftColor,
    appearance.lastSeenColor,
    appearance.trailColor,
    appearance.showInitials ? "1" : "0",
  ].join(":");

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        zoomControl={false}
        preferCanvas
        className="lm-map"
        style={{ height: "100%", width: "100%" }}
      >
      <TileLayer
        key={tile.url}
        attribution={tile.attribution}
        url={tile.url}
        maxZoom={tile.maxZoom}
        maxNativeZoom={tile.maxNativeZoom}
        subdomains={tile.subdomains ?? "abc"}
        keepBuffer={6}
        updateWhenZooming={false}
        updateWhenIdle
        crossOrigin="anonymous"
      />
      <ZoomControl position="bottomright" />
      <MapClickPicker enabled={pickCenterEnabled} onPick={onPickCenter} />
      <TilesReadyGate onReady={onTilesReady} />
      <FitBounds
        positions={fitPositions}
        focusKey={focusKey}
        singleZoom={mode === "live" && locations.length === 1 ? 16 : 14}
      />
      {mode === "live" &&
      draftGeofence &&
      !(draftGeofence.lat === 0 && draftGeofence.lng === 0) ? (
        <Marker
          position={[draftGeofence.lat, draftGeofence.lng]}
          icon={zoneCenterIcon}
          zIndexOffset={900}
        >
          <Popup className="lm-popup">
            <div className="lm-popup-body">
              <p className="lm-popup-name">{t("Zone center")}</p>
              <p className="lm-popup-updated">
                {draftGeofence.lat.toFixed(5)}, {draftGeofence.lng.toFixed(5)}
              </p>
            </div>
          </Popup>
        </Marker>
      ) : null}
      {mode === "live"
        ? locations.map((l) => {
            const isSelected = selectedId === l.employeeId;
            const draft =
              draftGeofence && draftGeofence.employeeId === l.employeeId
                ? draftGeofence
                : null;
            const rawLat = draft?.lat ?? l.geofenceLat;
            const rawLng = draft?.lng ?? l.geofenceLng;
            const zoneLat =
              rawLat != null && rawLng != null && !(rawLat === 0 && rawLng === 0)
                ? rawLat
                : null;
            const zoneLng =
              rawLat != null && rawLng != null && !(rawLat === 0 && rawLng === 0)
                ? rawLng
                : null;
            const zoneRadius =
              zoneLat != null
                ? (draft?.radiusMeters ?? l.geofenceRadiusMeters ?? null)
                : null;
            const showZone =
              zoneLat != null &&
              zoneLng != null &&
              zoneRadius != null &&
              (!selectedId || isSelected);

            return (
              <Fragment key={l.employeeId}>
                {showZone ? (
                  <Circle
                    key={`zone-${l.employeeId}:${zoneLat}:${zoneLng}:${zoneRadius}`}
                    center={[zoneLat, zoneLng]}
                    radius={zoneRadius}
                    pathOptions={{
                      color: appearance.onShiftColor,
                      fillColor: appearance.onShiftColor,
                      fillOpacity: isSelected ? 0.16 : 0.08,
                      weight: isSelected ? 2.5 : 1.5,
                      opacity: isSelected ? 0.85 : 0.45,
                    }}
                  />
                ) : null}
                <Marker
                  key={`${l.employeeId}:${appearanceKey}:${isSelected ? "1" : "0"}:${l.avatarUrl ?? ""}`}
                  position={[l.lat, l.lng]}
                  icon={liveIcons.get(l.employeeId)!}
                  opacity={l.isClockedIn === false ? 0.82 : 1}
                  zIndexOffset={isSelected ? 800 : 0}
                >
                  <Popup className="lm-popup">
                    <div className="lm-popup-body">
                      {l.avatarUrl ? (
                        <img
                          className="lm-popup-photo"
                          src={mediaUrl(l.avatarUrl) ?? ""}
                          alt=""
                        />
                      ) : null}
                      <p className="lm-popup-name">{l.name}</p>
                      <p className="lm-popup-meta">{l.jobTitle ?? l.role}</p>
                      <p
                        className={
                          l.isClockedIn === false
                            ? "lm-popup-status lm-popup-status--idle"
                            : "lm-popup-status lm-popup-status--active"
                        }
                      >
                        {l.isClockedIn === false
                          ? t("Last seen · clocked out")
                          : t("On shift")}
                      </p>
                      {zoneRadius != null ? (
                        <p className="lm-popup-updated">
                          {t("Zone ·")}{zoneRadius}{t("m radius")}</p>
                      ) : null}
                      <p className="lm-popup-updated">
                        {t("Updated")}{l.secondsSinceUpdate ?? 0}{t("s ago")}</p>
                    </div>
                  </Popup>
                </Marker>
              </Fragment>
            );
          })
        : null}
      {mode === "history" && trailPositions.length > 1 ? (
        <Polyline
          positions={trailPositions}
          pathOptions={{
            color: appearance.trailColor,
            weight: 4,
            opacity: 0.78,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      ) : null}
      {mode === "history" && focusPoint ? (
        <Marker
          position={[focusPoint.lat, focusPoint.lng]}
          icon={focusMarkerIcon}
        >
          <Popup className="lm-popup">
            <div className="lm-popup-body">
              <p className="lm-popup-name">{t("Trail position")}</p>
              <p className="lm-popup-updated">
                {t("Recorded")}{new Date(focusPoint.recordedAt).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
      <div
        className={`lm-tiles-veil${tilesReady ? " lm-tiles-veil--hide" : ""}`}
        aria-hidden
      />
    </div>
  );
}
