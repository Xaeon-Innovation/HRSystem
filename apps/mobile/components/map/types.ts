import type { MapMarker } from "@/lib/map/geojson";

export type ElevoraMapProps = {
  styleURL?: string;
  center: { lat: number; lng: number };
  zoom?: number;
  /** When set, camera fits the work zone so streets around it are visible. */
  fitZone?: boolean;
  zone?: { lat: number; lng: number; radiusMeters: number } | null;
  route?: Array<{ lat: number; lng: number }>;
  markers?: MapMarker[];
  className?: string;
  /** Full-bleed map (no card chrome) — prototype Map tab. */
  bleed?: boolean;
};
