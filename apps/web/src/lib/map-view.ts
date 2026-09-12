export function estimateMapZoom(positions: Array<[number, number]>): number {
  if (positions.length <= 1) return 15;
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;
  for (const [lat, lng] of positions) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const span = Math.max(maxLat - minLat, maxLng - minLng);
  if (span < 0.008) return 16;
  if (span < 0.02) return 15;
  if (span < 0.05) return 14;
  if (span < 0.12) return 13;
  if (span < 0.3) return 12;
  if (span < 0.8) return 11;
  if (span < 2) return 10;
  if (span < 5) return 8;
  return 6;
}

export function filterLiveLocations<
  T extends { name: string; jobTitle: string | null; role: string },
>(locations: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return locations;
  return locations.filter(
    (l) =>
      l.name.toLowerCase().includes(needle) ||
      (l.jobTitle ?? "").toLowerCase().includes(needle) ||
      l.role.toLowerCase().includes(needle),
  );
}
