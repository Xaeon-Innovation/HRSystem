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

export function getPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is unavailable on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new Error(
              "Location permission denied. Allow location access to clock in or out.",
            ),
          );
          return;
        }
        reject(new Error("Could not read your location. Check GPS and try again."));
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
