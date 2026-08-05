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
      resolve({ lat: 30.0444, lng: 31.2357 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve({ lat: 30.0444, lng: 31.2357 }),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}
