const QUEUE_KEY = "hr_clock_queue";

export type QueuedClockEvent = {
  type: "clock-in" | "clock-out";
  lat: number;
  lng: number;
  clientEventId: string;
  clientTimestamp: string;
};

function readQueue(): QueuedClockEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedClockEvent[];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedClockEvent[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueClockEvent(event: QueuedClockEvent) {
  const q = readQueue();
  q.push(event);
  writeQueue(q);
}

export async function flushClockQueue(
  send: (item: QueuedClockEvent) => Promise<void>,
) {
  const q = readQueue();
  const remaining: QueuedClockEvent[] = [];
  for (const item of q) {
    try {
      await send(item);
    } catch {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  return remaining.length;
}

export type GeoCoords = { lat: number; lng: number };

export type LastKnownPosition = GeoCoords & { at: number };

const GEO_UNAVAILABLE =
  "Location is unavailable. Enable Location Services for this browser, then try again.";

function geoErrorCode(err: unknown): number | null {
  if (typeof err !== "object" || err === null || !("code" in err)) return null;
  const code = Number((err as { code: unknown }).code);
  return Number.isFinite(code) ? code : null;
}

export function messageForGeoError(
  err: unknown,
  context: "clock" | "map" = "clock",
): string {
  const code = geoErrorCode(err);
  if (code === 1) {
    return context === "map"
      ? "Location permission denied. Allow location access to appear on the live map."
      : "Location permission denied. Allow location access to clock in or out.";
  }
  if (code === 3) {
    return "Location is taking too long. Check Location Services and try again.";
  }
  if (code === 2) return GEO_UNAVAILABLE;
  if (err instanceof Error && err.message) return err.message;
  return GEO_UNAVAILABLE;
}

function requestPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(GEO_UNAVAILABLE));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function getPosition(): Promise<GeoCoords> {
  const fromPos = (pos: GeolocationPosition): GeoCoords => ({
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
  });

  return requestPosition({
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 30000,
  })
    .catch((err) => {
      if (geoErrorCode(err) === 1) {
        throw new Error(messageForGeoError(err, "clock"));
      }
      return requestPosition({
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      });
    })
    .then(fromPos)
    .catch((err) => {
      throw new Error(messageForGeoError(err, "clock"));
    });
}
