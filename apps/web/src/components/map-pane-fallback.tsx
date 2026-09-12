import { t } from "@/i18n";
/** Placeholder while Leaflet / first tiles are on the way. */
export function MapPaneFallback() {
  return (
    <div
      className="lm-map-fallback h-full w-full"
      aria-busy="true"
      aria-label={t("Loading map")}
    />
  );
}
