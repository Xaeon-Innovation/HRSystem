import { useCallback, useEffect } from "react";
import { desc, eq } from "drizzle-orm";
import { fetchMe } from "../api";
import { db, isLocalDbAvailable } from "../db/client";
import { clockSessions, shiftInstances } from "../db/schema";
import { captureClockLocation } from "../location";
import { cancelOvertimePrompts, scheduleOvertimePrompts } from "../overtime-notify";
import { useSession } from "../session";
import { runSyncCycle } from "../sync/engine";
import { enqueueOutbox } from "../sync/outbox";
import { pullSync } from "../sync/pull";
import { startTracking, stopTracking } from "../tracking";
import { useTodayStore, type ClockState } from "../today-store";

function clockStateFromSession(raw: Record<string, unknown> | null): ClockState {
  if (!raw) return "off";
  const flags = Array.isArray(raw.anomalyFlags) ? raw.anomalyFlags : [];
  if (flags.includes("on_break") || flags.includes("break")) return "break";
  if (raw.clockOutAt == null && raw.clockInAt != null) return "on";
  return "off";
}

async function maybeScheduleOvertimeFromShifts(): Promise<void> {
  try {
    let endAt: string | null = null;
    if (isLocalDbAvailable) {
      const rows = await db
        .select()
        .from(shiftInstances)
        .where(eq(shiftInstances.deleted, 0))
        .orderBy(desc(shiftInstances.updatedAt))
        .limit(5);
      for (const row of rows) {
        const json = JSON.parse(row.json) as { endAt?: string; status?: string };
        if (json.endAt && json.status !== "completed") {
          endAt = json.endAt;
          break;
        }
      }
    }
    if (!endAt) return;
    const end = new Date(endAt);
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return;
    await scheduleOvertimePrompts({ shiftEndAt: end });
  } catch {
    /* ignore */
  }
}

const REFRESH_COOLDOWN_MS = 5_000;
let refreshInFlight: Promise<void> | null = null;
let lastRefreshAt = 0;

export function useToday() {
  const setMe = useSession((s) => s.setMe);
  const sessionMe = useSession((s) => s.me);
  const clockState = useTodayStore((s) => s.clockState);
  const sessionJson = useTodayStore((s) => s.sessionJson);
  const loading = useTodayStore((s) => s.loading);
  const syncing = useTodayStore((s) => s.syncing);
  const error = useTodayStore((s) => s.error);
  const lastLocationLabel = useTodayStore((s) => s.lastLocationLabel);
  const trackingActive = useTodayStore((s) => s.trackingActive);
  const zoneStatus = useTodayStore((s) => s.zoneStatus);
  const needsBgDisclosure = useTodayStore((s) => s.needsBgDisclosure);

  // Reads the session from the store rather than closing over `sessionMe`:
  // refresh() calls setMe(), and a dependency on sessionMe would recreate
  // refresh and re-run the mount effect in an endless fetch loop.
  const syncTracking = useCallback(
    async (state: ClockState, me = useSession.getState().me) => {
      if (!me) return;
      if (state === "off") {
        await stopTracking();
        await cancelOvertimePrompts();
        return;
      }
      await startTracking({
        presenceMode: me.presenceMode,
        fieldOps: me.entitlements.fieldOps,
        zone: me.zones[0] ?? null,
      });
      await maybeScheduleOvertimeFromShifts();
    },
    [],
  );

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    // Screens kept alive by the router re-run their mount effects when shown
    // again, so automatic refreshes share one request and back off briefly.
    if (refreshInFlight) return refreshInFlight;
    if (!opts?.force && Date.now() - lastRefreshAt < REFRESH_COOLDOWN_MS) return;
    refreshInFlight = runRefresh().finally(() => {
      lastRefreshAt = Date.now();
      refreshInFlight = null;
    });
    return refreshInFlight;
  }, [setMe, syncTracking]);

  const runRefresh = async () => {
    useTodayStore.getState().setLoading(true);
    useTodayStore.getState().setError(null);
    try {
      const profile = await fetchMe();
      setMe(profile);
      useTodayStore.getState().setMeLocal(profile);

      const data = await pullSync();
      let raw: Record<string, unknown> | null = null;

      if (isLocalDbAvailable) {
        const rows = await db
          .select()
          .from(clockSessions)
          .where(eq(clockSessions.deleted, 0))
          .orderBy(desc(clockSessions.updatedAt))
          .limit(1);
        raw = rows[0]
          ? (JSON.parse(rows[0].json) as Record<string, unknown>)
          : null;
      } else {
        const upserts = data.changes.clockSessions?.upserts ?? [];
        const open = upserts.find(
          (s) => s.clockOutAt == null || s.clockOutAt === undefined,
        );
        // Prefer open session; otherwise newest by clockInAt.
        const latest =
          open ??
          [...upserts].sort((a, b) =>
            String(b.clockInAt ?? "").localeCompare(String(a.clockInAt ?? "")),
          )[0];
        raw = latest ? (latest as unknown as Record<string, unknown>) : null;
      }

      const nextState = clockStateFromSession(raw);
      useTodayStore.getState().setSessionJson(raw);
      useTodayStore.getState().setClockState(nextState);
      await syncTracking(nextState, profile);
    } catch (e) {
      useTodayStore
        .getState()
        .setError(e instanceof Error ? e.message : "Failed to load today");
    } finally {
      useTodayStore.getState().setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const pushClockEvent = useCallback(
    async (
      type: "clock.in" | "clock.out" | "break.start" | "break.end",
    ): Promise<boolean> => {
      useTodayStore.getState().setSyncing(true);
      useTodayStore.getState().setError(null);
      try {
        const location = await captureClockLocation();
        useTodayStore
          .getState()
          .setLastLocationLabel(
            `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} · ±${Math.round(location.accuracyM)} m${
              location.mocked ? " · zone" : ""
            }`,
          );
        await enqueueOutbox({ type, location });
        const cycle = await runSyncCycle();
        if (cycle.error) throw new Error(cycle.error);
        // Bust web pull cache so the new attendance row is visible immediately.
        await pullSync({ force: true });
        await refresh({ force: true });
        return true;
      } catch (e) {
        useTodayStore
          .getState()
          .setError(e instanceof Error ? e.message : "Clock action failed");
        return false;
      } finally {
        useTodayStore.getState().setSyncing(false);
      }
    },
    [refresh],
  );

  return {
    me: sessionMe,
    clockState,
    sessionJson,
    loading,
    syncing,
    error,
    lastLocationLabel,
    trackingActive,
    zoneStatus,
    needsBgDisclosure,
    refresh: () => refresh({ force: true }),
    queueClockIn: () => pushClockEvent("clock.in"),
    queueClockOut: () => pushClockEvent("clock.out"),
    queueBreakStart: () => pushClockEvent("break.start"),
    queueBreakEnd: () => pushClockEvent("break.end"),
  };
}
