import { pullSync } from "./pull";
import { pendingOutboxCount, pushOutbox } from "./outbox";

export type SyncCycleResult = {
  pulled: number;
  pushed: number;
  pending: number;
  error?: string;
};

/** One sync cycle: push outbox then pull server changes. */
export async function runSyncCycle(): Promise<SyncCycleResult> {
  let pushed = 0;
  let pulled = 0;
  try {
    const results = await pushOutbox();
    pushed = results.filter(
      (r) => r.status === "applied" || r.status === "duplicate",
    ).length;
    const rejected = results.find(
      (r) => r.status === "rejected" || r.status === "conflict",
    );
    if (rejected) {
      const reason = rejected.reason ?? rejected.status;
      const friendly =
        reason === "outside_zone"
          ? "Outside work zone — move inside or open Clock check"
          : reason === "location_required"
            ? "Location required for this action"
            : reason === "Not clocked in"
              ? "Not clocked in"
              : String(reason);
      return {
        pulled: 0,
        pushed,
        pending: await pendingOutboxCount(),
        error: friendly,
      };
    }
  } catch (err) {
    return {
      pulled: 0,
      pushed: 0,
      pending: await pendingOutboxCount(),
      error: err instanceof Error ? err.message : "push failed",
    };
  }

  try {
    const data = await pullSync();
    const c = data.changes;
    pulled =
      (c.shiftInstances?.upserts.length ?? 0) +
      (c.clockSessions?.upserts.length ?? 0) +
      (c.leaveRequests?.upserts.length ?? 0) +
      (c.tasks?.upserts.length ?? 0) +
      (c.notifications?.upserts.length ?? 0);
  } catch (err) {
    return {
      pulled: 0,
      pushed,
      pending: await pendingOutboxCount(),
      error: err instanceof Error ? err.message : "pull failed",
    };
  }

  return {
    pulled,
    pushed,
    pending: await pendingOutboxCount(),
  };
}
