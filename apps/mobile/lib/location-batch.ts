import { and, asc, eq, inArray } from "drizzle-orm";
import type { MobileLocationsBatch } from "@hr/shared";
import { apiJson } from "./api";
import { db, isLocalDbAvailable } from "./db/client";
import { locationPoints } from "./db/schema";

export type PendingPoint = {
  id: string;
  lat: number;
  lng: number;
  accuracyM: number;
  recordedAt: string;
  mocked?: boolean;
  speed?: number;
  heading?: number;
};

const memoryPoints: PendingPoint[] = [];
const FLUSH_COUNT = 100;
const FLUSH_MS = 2 * 60 * 1000;

let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Persist a ping locally; may trigger an immediate flush. */
export async function recordLocationPoint(
  point: Omit<PendingPoint, "id"> & { id?: string },
): Promise<void> {
  const row: PendingPoint = {
    id: point.id ?? uuid(),
    lat: point.lat,
    lng: point.lng,
    accuracyM: point.accuracyM,
    recordedAt: point.recordedAt,
    mocked: point.mocked,
    speed: point.speed,
    heading: point.heading,
  };

  if (isLocalDbAvailable) {
    await db.insert(locationPoints).values({
      id: row.id,
      lat: row.lat,
      lng: row.lng,
      accuracyM: row.accuracyM,
      recordedAt: row.recordedAt,
      sent: 0,
    });
  } else {
    memoryPoints.push(row);
  }

  const pending = await countPending();
  if (pending >= FLUSH_COUNT) {
    await flushLocationBatch();
  }
}

async function countPending(): Promise<number> {
  if (!isLocalDbAvailable) return memoryPoints.length;
  const rows = await db
    .select({ id: locationPoints.id })
    .from(locationPoints)
    .where(eq(locationPoints.sent, 0));
  return rows.length;
}

async function loadPending(limit = 500): Promise<PendingPoint[]> {
  if (!isLocalDbAvailable) {
    return memoryPoints.slice(0, limit);
  }
  const rows = await db
    .select()
    .from(locationPoints)
    .where(eq(locationPoints.sent, 0))
    .orderBy(asc(locationPoints.recordedAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    accuracyM: r.accuracyM,
    recordedAt: r.recordedAt,
  }));
}

async function markSent(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isLocalDbAvailable) {
    for (let i = memoryPoints.length - 1; i >= 0; i--) {
      if (ids.includes(memoryPoints[i]!.id)) memoryPoints.splice(i, 1);
    }
    return;
  }
  await db
    .update(locationPoints)
    .set({ sent: 1 })
    .where(
      and(inArray(locationPoints.id, ids), eq(locationPoints.sent, 0)),
    );
}

/** POST unsent points to `/v1/mobile/locations/batch`. */
export async function flushLocationBatch(): Promise<{
  accepted: number;
  error?: string;
}> {
  if (flushing) return { accepted: 0 };
  const pending = await loadPending(500);
  if (pending.length === 0) return { accepted: 0 };

  flushing = true;
  try {
    const body: MobileLocationsBatch = {
      points: pending.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        accuracyM: p.accuracyM,
        at: p.recordedAt,
        mocked: p.mocked,
        speed: p.speed,
        heading: p.heading,
        clientPingId: p.id,
      })),
    };
    const res = await apiJson<{ accepted: number; serverTime: string }>(
      "/v1/mobile/locations/batch",
      { method: "POST", body: JSON.stringify(body) },
    );
    await markSent(pending.map((p) => p.id));
    return { accepted: res.accepted };
  } catch (e) {
    return {
      accepted: 0,
      error: e instanceof Error ? e.message : "batch_failed",
    };
  } finally {
    flushing = false;
  }
}

export function startBatchFlushLoop(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    void flushLocationBatch();
  }, FLUSH_MS);
}

export function stopBatchFlushLoop(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function pendingLocationCount(): Promise<number> {
  return countPending();
}

/** Today's trail for the Map tab (sent + pending, newest last). */
export async function listRoutePoints(limit = 200): Promise<
  Array<{ lat: number; lng: number }>
> {
  if (!isLocalDbAvailable) {
    return memoryPoints
      .slice(-limit)
      .map((p) => ({ lat: p.lat, lng: p.lng }));
  }
  const rows = await db
    .select()
    .from(locationPoints)
    .orderBy(asc(locationPoints.recordedAt))
    .limit(limit);
  return rows.map((r) => ({ lat: r.lat, lng: r.lng }));
}
