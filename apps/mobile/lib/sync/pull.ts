import { eq } from "drizzle-orm";
import type { MobileSyncPullResponse } from "@hr/shared";
import { apiJson } from "../api";
import { db, isLocalDbAvailable } from "../db/client";
import {
  clockSessions,
  leaveRequests,
  notifications,
  shiftInstances,
  syncState,
  tasks,
} from "../db/schema";

const CURSOR_KEY = "sync.cursor";

/** Coalesce parallel pulls + short web cache to avoid API rate limits. */
let pullInFlight: Promise<MobileSyncPullResponse> | null = null;
let lastPull: { at: number; data: MobileSyncPullResponse } | null = null;
const WEB_CACHE_MS = 8_000;

async function getCursor(): Promise<string | undefined> {
  if (!isLocalDbAvailable) return undefined;
  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.key, CURSOR_KEY))
    .limit(1);
  return rows[0]?.value;
}

async function setCursor(cursor: string) {
  if (!isLocalDbAvailable) return;
  await db
    .insert(syncState)
    .values({ key: CURSOR_KEY, value: cursor })
    .onConflictDoUpdate({
      target: syncState.key,
      set: { value: cursor },
    });
}

type EntityTable =
  | typeof shiftInstances
  | typeof clockSessions
  | typeof leaveRequests
  | typeof tasks
  | typeof notifications;

async function applyUpserts(
  table: EntityTable,
  upserts: Array<{ id: string; version?: number; [k: string]: unknown }>,
  deletes: string[],
) {
  if (!isLocalDbAvailable) return;
  for (const row of upserts) {
    const updatedAt =
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : new Date().toISOString();
    await db
      .insert(table)
      .values({
        id: row.id,
        version: typeof row.version === "number" ? row.version : 1,
        deleted: 0,
        json: JSON.stringify(row),
        updatedAt,
      })
      .onConflictDoUpdate({
        target: table.id,
        set: {
          version: typeof row.version === "number" ? row.version : 1,
          deleted: 0,
          json: JSON.stringify(row),
          updatedAt,
        },
      });
  }
  for (const id of deletes) {
    await db
      .update(table)
      .set({ deleted: 1, updatedAt: new Date().toISOString() })
      .where(eq(table.id, id));
  }
}

async function pullOnce(): Promise<MobileSyncPullResponse> {
  const cursor = await getCursor();
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  const data = await apiJson<MobileSyncPullResponse>(
    `/v1/mobile/sync/pull${qs}`,
  );

  if (isLocalDbAvailable) {
    const c = data.changes;
    await applyUpserts(
      shiftInstances,
      c.shiftInstances?.upserts ?? [],
      c.shiftInstances?.deletes ?? [],
    );
    await applyUpserts(
      clockSessions,
      c.clockSessions?.upserts ?? [],
      c.clockSessions?.deletes ?? [],
    );
    await applyUpserts(
      leaveRequests,
      c.leaveRequests?.upserts ?? [],
      c.leaveRequests?.deletes ?? [],
    );
    await applyUpserts(tasks, c.tasks?.upserts ?? [], c.tasks?.deletes ?? []);
    await applyUpserts(
      notifications,
      c.notifications?.upserts ?? [],
      c.notifications?.deletes ?? [],
    );
    if (data.cursor) await setCursor(data.cursor);
  }

  return data;
}

/** Pull changes from Postgres via `/v1/mobile/sync/pull` into SQLite (native). */
export async function pullSync(opts?: {
  force?: boolean;
}): Promise<MobileSyncPullResponse> {
  // After mutations, callers pass force:true so we don't serve a pre-clock cache.
  if (
    !opts?.force &&
    !isLocalDbAvailable &&
    lastPull &&
    Date.now() - lastPull.at < WEB_CACHE_MS
  ) {
    return lastPull.data;
  }

  if (pullInFlight) return pullInFlight;

  pullInFlight = (async () => {
    const data = await pullOnce();
    lastPull = { at: Date.now(), data };
    return data;
  })().finally(() => {
    pullInFlight = null;
  });

  return pullInFlight;
}
