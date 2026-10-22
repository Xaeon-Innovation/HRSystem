import { apiJson } from "../api";

export type MapRegionsResponse = {
  regions: Array<{
    id: string;
    name: string;
    bounds: [[number, number], [number, number]];
    minZoom: number;
    maxZoom: number;
  }>;
  styles: { light: string; dark: string };
};

export type TeamMember = {
  employeeId: string;
  name: string;
  presenceMode: string;
  lat: number | null;
  lng: number | null;
  updatedAt: string | null;
  isClockedIn: boolean;
};

export type TeamPresenceResponse = {
  members: TeamMember[];
  serverTime: string;
};

/** OpenFreeMap — real streets/labels (demotiles is abstract continents only). */
export const FALLBACK_STYLE =
  "https://tiles.openfreemap.org/styles/liberty";
export const FALLBACK_STYLE_DARK =
  "https://tiles.openfreemap.org/styles/dark";

export async function fetchMapRegions(): Promise<MapRegionsResponse> {
  return apiJson<MapRegionsResponse>("/v1/mobile/map/regions");
}

export async function fetchTeamPresence(): Promise<TeamPresenceResponse> {
  return apiJson<TeamPresenceResponse>("/v1/mobile/team/presence");
}

export async function fetchRealtimeToken(): Promise<{
  token: string;
  expiresInSec: number;
}> {
  return apiJson("/v1/mobile/realtime/token");
}
