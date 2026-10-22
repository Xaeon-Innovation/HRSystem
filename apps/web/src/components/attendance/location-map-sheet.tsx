"use client";

import dynamic from "next/dynamic";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPaneFallback } from "@/components/map-pane-fallback";
import { t } from "@/i18n";

const AttendanceLocationPinMap = dynamic(
  () =>
    import("@/components/attendance/location-pin-map").then(
      (m) => m.AttendanceLocationPinMap,
    ),
  { ssr: false, loading: () => <MapPaneFallback /> },
);

export type ClockMapPoint = {
  kind: "in" | "out";
  at: string;
  lat: number;
  lng: number;
  employeeName: string;
};

function formatCoords(lat: number, lng: number) {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function formatClockTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function AttendanceLocationMapSheet({
  point,
  onOpenChange,
}: {
  point: ClockMapPoint | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = Boolean(point);
  const title =
    point?.kind === "out" ? t("Clock-out location") : t("Clock-in location");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {point ? (
            <SheetDescription className="space-y-1 text-sm text-muted-foreground">
              <span className="block truncate font-medium text-foreground">
                {point.employeeName}
              </span>
              <span className="block tabular-nums">
                {formatClockTime(point.at)} · {formatCoords(point.lat, point.lng)}
              </span>
            </SheetDescription>
          ) : null}
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
          {point ? (
            <AttendanceLocationPinMap lat={point.lat} lng={point.lng} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
