/** Human distance for zone chips (meters → m / km). */
export function formatDistanceM(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m >= 1000) {
    const km = m / 1000;
    return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
  }
  return `${m} m`;
}
