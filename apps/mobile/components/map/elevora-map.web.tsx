import { useEffect, useRef } from "react";
import { View } from "react-native";
import {
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type Map as MapLibreMapType,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  lineFromPoints,
  markersToGeoJson,
  zoneCirclePolygon,
  type MapMarker,
} from "@/lib/map/geojson";
import { FALLBACK_STYLE } from "@/lib/map/api";
import type { ElevoraMapProps } from "./types";

export type { ElevoraMapProps };

const ZONE_SRC = "elevora-zone";
const ROUTE_SRC = "elevora-route";
const MARKERS_SRC = "elevora-markers";

/** Metro cannot serve MapLibre's module worker — load it from the CDN build. */
let workerConfigured = false;
function ensureMapWorker() {
  if (workerConfigured) return;
  setWorkerUrl(
    "https://unpkg.com/maplibre-gl@6.14.0/dist/maplibre-gl-worker.mjs",
  );
  workerConfigured = true;
}

type JsonData = Parameters<GeoJSONSource["setData"]>[0];

function fitZoneCamera(
  map: MapLibreMapType,
  zone: NonNullable<ElevoraMapProps["zone"]>,
) {
  const pad = Math.max(zone.radiusMeters * 1.8, 400);
  const dLat = pad / 111_320;
  const dLng = pad / (111_320 * Math.cos((zone.lat * Math.PI) / 180));
  map.fitBounds(
    [
      [zone.lng - dLng, zone.lat - dLat],
      [zone.lng + dLng, zone.lat + dLat],
    ],
    { padding: 36, duration: 0, maxZoom: 16 },
  );
}

export function ElevoraMap({
  styleURL,
  center,
  zoom = 15,
  fitZone = true,
  zone,
  route = [],
  markers = [],
  className = "",
  bleed = false,
}: ElevoraMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMapType | null>(null);
  const appliedStyle = useRef<string | null>(null);
  const layerState = useRef({ zone, route, markers, fitZone, center, zoom });
  layerState.current = { zone, route, markers, fitZone, center, zoom };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    ensureMapWorker();
    const initialStyle = styleURL || FALLBACK_STYLE;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: initialStyle,
      center: [center.lng, center.lat],
      zoom,
      attributionControl: { compact: true },
    });
    map.addControl(
      new NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;
    appliedStyle.current = initialStyle;

    map.on("load", () => {
      const s = layerState.current;
      syncLayers(map, s.zone, s.route, s.markers);
      if (s.fitZone && s.zone) fitZoneCamera(map, s.zone);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      appliedStyle.current = null;
    };
    // Mount once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleURL || styleURL === appliedStyle.current) return;
    const onStyle = () => {
      appliedStyle.current = styleURL;
      const s = layerState.current;
      syncLayers(map, s.zone, s.route, s.markers);
      if (s.fitZone && s.zone) fitZoneCamera(map, s.zone);
      else map.jumpTo({ center: [s.center.lng, s.center.lat], zoom: s.zoom });
    };
    map.once("style.load", onStyle);
    map.setStyle(styleURL);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [styleURL]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (fitZone && zone) {
      fitZoneCamera(map, zone);
      return;
    }
    map.jumpTo({ center: [center.lng, center.lat], zoom });
  }, [center.lat, center.lng, zoom, fitZone, zone?.lat, zone?.lng, zone?.radiusMeters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncLayers(map, zone, route, markers);
  }, [zone, route, markers]);

  return (
    <View
      className={
        bleed
          ? `overflow-hidden ${className}`
          : `min-h-[360px] flex-1 overflow-hidden rounded-2xl border border-line ${className}`
      }
      style={bleed ? { position: "absolute", inset: 0 } : undefined}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          minHeight: bleed ? "100%" : 360,
        }}
      />
    </View>
  );
}

function ensureLayer(
  map: MapLibreMapType,
  id: string,
  spec: Parameters<MapLibreMapType["addLayer"]>[0],
) {
  if (!map.getLayer(id)) map.addLayer(spec);
}

function syncLayers(
  map: MapLibreMapType,
  zone: ElevoraMapProps["zone"],
  route: Array<{ lat: number; lng: number }>,
  markers: MapMarker[],
) {
  const setSrc = (id: string, data: JsonData) => {
    const src = map.getSource(id) as GeoJSONSource | undefined;
    if (src) src.setData(data);
    else map.addSource(id, { type: "geojson", data });
  };

  if (zone) {
    setSrc(
      ZONE_SRC,
      zoneCirclePolygon(zone.lat, zone.lng, zone.radiusMeters) as JsonData,
    );
    ensureLayer(map, "elevora-zone-fill", {
      id: "elevora-zone-fill",
      type: "fill",
      source: ZONE_SRC,
      paint: { "fill-color": "#C8F000", "fill-opacity": 0.22 },
    });
    ensureLayer(map, "elevora-zone-line", {
      id: "elevora-zone-line",
      type: "line",
      source: ZONE_SRC,
      paint: { "line-color": "#1A2600", "line-width": 2 },
    });
  }

  const line = lineFromPoints(route);
  setSrc(
    ROUTE_SRC,
    (line ?? { type: "FeatureCollection", features: [] }) as JsonData,
  );
  ensureLayer(map, "elevora-route-line", {
    id: "elevora-route-line",
    type: "line",
    source: ROUTE_SRC,
    paint: { "line-color": "#2F6FED", "line-width": 3 },
  });

  setSrc(MARKERS_SRC, markersToGeoJson(markers) as JsonData);
  ensureLayer(map, "elevora-markers-circle", {
    id: "elevora-markers-circle",
    type: "circle",
    source: MARKERS_SRC,
    paint: {
      "circle-radius": 9,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#ffffff",
      "circle-color": [
        "match",
        ["get", "kind"],
        "you",
        "#2F6FED",
        "team-on",
        "#C8F000",
        "team-late",
        "#E8A317",
        "#8E8E89",
      ],
    },
  });
}
