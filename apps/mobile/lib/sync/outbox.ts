import { and, asc, eq, inArray } from "drizzle-orm";
import type { MobileOutboxEvent, MobilePushResult } from "@hr/shared";
import { apiJson } from "../api";
import { db, isLocalDbAvailable } from "../db/client";
import { outbox } from "../db/schema";
import { getMobileDevice } from "../device";
import { useSession } from "../session";
import { aggregateKeyFor } from "./aggregate";

type OutboxRow = {
  id: string;
  type: string;
  payloadJson: string;
  occurredAt: string;
  aggregateKey: string;
  baseVersion: number | null;
  attempts: number;
  lastError: string | null;
  status: string;
  createdAt: string;
};

/** In-memory outbox for web preview (no SharedArrayBuffer / SQLite). */
const memoryOutbox: OutboxRow[] = [];

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

/** Distributive omit so payload fields survive on leave/task events. */
export type EnqueueInput = MobileOutboxEvent extends infer E
  ? E extends MobileOutboxEvent
    ? Omit<E, "id" | "occurredAt" | "deviceUptimeMs" | "capturedOffline"> &
        Partial<
          Pick<E, "id" | "occurredAt" | "deviceUptimeMs" | "capturedOffline">
        >
    : never
  : never;

/** Enqueue a domain event. Native: SQLite. Web: memory. */
export async function enqueueOutbox(
  partial: EnqueueInput,
): Promise<MobileOutboxEvent> {
  const me = useSession.getState().me;
  const userId = me?.user.id ?? "anonymous";
  const event = {
    ...partial,
    id: partial.id ?? uuid(),
    occurredAt: partial.occurredAt ?? new Date().toISOString(),
    deviceUptimeMs: partial.deviceUptimeMs ?? 0,
    capturedOffline: partial.capturedOffline ?? false,
  } as MobileOutboxEvent;

  const row: OutboxRow = {
    id: event.id,
    type: event.type,
    payloadJson: JSON.stringify(event),
    occurredAt: event.occurredAt,
    aggregateKey: aggregateKeyFor(event, userId),
    baseVersion: event.baseVersion ?? null,
    attempts: 0,
    lastError: null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (isLocalDbAvailable) {
    await db.insert(outbox).values(row);
  } else {
    memoryOutbox.push(row);
  }

  return event;
}

export async function listOutbox(status?: string): Promise<OutboxRow[]> {
  if (!isLocalDbAvailable) {
    return status
      ? memoryOutbox.filter((r) => r.status === status)
      : [...memoryOutbox];
  }
  if (status) {
    return db.select().from(outbox).where(eq(outbox.status, status));
  }
  return db.select().from(outbox).orderBy(asc(outbox.occurredAt));
}

export async function pendingOutboxCount(): Promise<number> {
  const rows = await listOutbox("pending");
  return rows.length;
}

let pushInFlight: Promise<MobilePushResult[]> | null = null;

/**
 * Push pending outbox events (ordered by occurredAt, batched ≤100).
 * Coalesces concurrent callers into one flight.
 */
export async function pushOutbox(): Promise<MobilePushResult[]> {
  if (pushInFlight) return pushInFlight;
  pushInFlight = (async () => {
    const pending = await listOutbox("pending");
    if (pending.length === 0) return [];

    // Stable order: aggregate then time.
    pending.sort((a, b) => {
      const ag = a.aggregateKey.localeCompare(b.aggregateKey);
      if (ag !== 0) return ag;
      return a.occurredAt.localeCompare(b.occurredAt);
    });

    const batch = pending.slice(0, 100);
    const events = batch.map(
      (r) => JSON.parse(r.payloadJson) as MobileOutboxEvent,
    );
    const ids = batch.map((r) => r.id);

    if (isLocalDbAvailable) {
      await db
        .update(outbox)
        .set({ status: "sending" })
        .where(inArray(outbox.id, ids));
    } else {
      for (const r of batch) r.status = "sending";
    }

    const device = await getMobileDevice();
    try {
      const res = await apiJson<{
        results: MobilePushResult[];
        serverTime: string;
      }>("/v1/mobile/sync/push", {
        method: "POST",
        headers: { "X-Device-Id": device.id },
        body: JSON.stringify({ events }),
      });

      for (const result of res.results) {
        const prev = batch.find((b) => b.id === result.id);
        const status =
          result.status === "applied" || result.status === "duplicate"
            ? "applied"
            : result.status;
        const attempts = (prev?.attempts ?? 0) + 1;
        if (isLocalDbAvailable) {
          await db
            .update(outbox)
            .set({
              status,
              lastError: result.reason ?? null,
              attempts,
            })
            .where(eq(outbox.id, result.id));
        } else {
          const row = memoryOutbox.find((r) => r.id === result.id);
          if (row) {
            row.status = status;
            row.lastError = result.reason ?? null;
            row.attempts = attempts;
          }
        }
      }
      return res.results;
    } catch (err) {
      const message = err instanceof Error ? err.message : "push failed";
      if (isLocalDbAvailable) {
        await db
          .update(outbox)
          .set({
            status: "pending",
            lastError: message,
            attempts: batch[0] ? batch[0].attempts + 1 : 1,
          })
          .where(
            and(inArray(outbox.id, ids), eq(outbox.status, "sending")),
          );
      } else {
        for (const r of batch) {
          r.status = "pending";
          r.lastError = message;
          r.attempts += 1;
        }
      }
      throw err;
    }
  })().finally(() => {
    pushInFlight = null;
  });

  return pushInFlight;
}

/** Resolve a conflict by dropping the local event (keep server). */
export async function discardOutboxEvent(id: string): Promise<void> {
  if (isLocalDbAvailable) {
    await db
      .update(outbox)
      .set({ status: "applied", lastError: "discarded_keep_server" })
      .where(eq(outbox.id, id));
    return;
  }
  const row = memoryOutbox.find((r) => r.id === id);
  if (row) {
    row.status = "applied";
    row.lastError = "discarded_keep_server";
  }
}

/** Mark conflict event pending again so push retries (re-apply mine). */
export async function retryOutboxEvent(id: string): Promise<void> {
  if (isLocalDbAvailable) {
    await db
      .update(outbox)
      .set({ status: "pending", lastError: null })
      .where(eq(outbox.id, id));
    return;
  }
  const row = memoryOutbox.find((r) => r.id === id);
  if (row) {
    row.status = "pending";
    row.lastError = null;
  }
}
