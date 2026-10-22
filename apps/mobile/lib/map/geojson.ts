type Position = [number, number];

type PolygonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "Polygon"; coordinates: Position[][] };
};

type LineFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: { type: "LineString"; coordinates: Position[] };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Point"; coordinates: Position };
  }>;
};

/** Approximate circle as a GeoJSON polygon (lon/lat). */
export function zoneCirclePolygon(
  lat: number,
  lng: number,
  radiusMeters: number,
  steps = 64,
): PolygonFeature {
  const coords: Position[] = [];
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    coords.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

export function lineFromPoints(
  points: Array<{ lat: number; lng: number }>,
): LineFeature | null {
  if (points.length < 2) return null;
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: points.map((p) => [p.lng, p.lat] as Position),
    },
  };
}

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "you" | "team-on" | "team-late" | "team-seen";
  label?: string;
};

export function markersToGeoJson(markers: MapMarker[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature" as const,
      properties: { id: m.id, kind: m.kind, label: m.label ?? "" },
      geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] as Position },
    })),
  };
}
