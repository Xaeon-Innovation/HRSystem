import { useCallback, useEffect, useState } from "react";
import { desc, eq } from "drizzle-orm";
import type { LeaveRequestStatus } from "@hr/shared";
import { db, isLocalDbAvailable } from "../db/client";
import { leaveRequests } from "../db/schema";
import { runSyncCycle } from "../sync/engine";
import { enqueueOutbox } from "../sync/outbox";
import { pullSync } from "../sync/pull";
import { useOutbox } from "./use-outbox";

export type LocalLeave = {
  id: string;
  version: number;
  status: LeaveRequestStatus | string;
  typeId: string;
  startDate: string;
  endDate: string;
  pendingLocal?: boolean;
  raw: Record<string, unknown>;
};

function mapRaw(
  raw: Record<string, unknown>,
  id: string,
  version: number,
  pendingLocal?: boolean,
): LocalLeave {
  return {
    id,
    version,
    status: (typeof raw.status === "string" ? raw.status : "draft") as string,
    typeId: typeof raw.typeId === "string" ? raw.typeId : "",
    startDate: typeof raw.startDate === "string" ? raw.startDate : "",
    endDate: typeof raw.endDate === "string" ? raw.endDate : "",
    pendingLocal,
    raw,
  };
}

export function useLeave() {
  const [items, setItems] = useState<LocalLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { rows: outboxRows } = useOutbox();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let list: LocalLeave[] = [];
      if (!isLocalDbAvailable) {
        const data = await pullSync();
        list = (data.changes.leaveRequests?.upserts ?? []).map((r) =>
          mapRaw(r as unknown as Record<string, unknown>, r.id, r.version),
        );
      } else {
        const rows = await db
          .select()
          .from(leaveRequests)
          .where(eq(leaveRequests.deleted, 0))
          .orderBy(desc(leaveRequests.updatedAt));
        list = rows.map((r) =>
          mapRaw(
            JSON.parse(r.json) as Record<string, unknown>,
            r.id,
            r.version,
          ),
        );
      }

      const pendingCreates = outboxRows.filter(
        (p) => p.type === "leave.create" && p.status === "pending",
      );
      for (const row of pendingCreates) {
        try {
          const ev = JSON.parse(row.payloadJson) as {
            id: string;
            payload?: {
              typeId?: string;
              startDate?: string;
              endDate?: string;
            };
          };
          if (list.some((l) => l.id === ev.id)) continue;
          list = [
            mapRaw(
              {
                status: "pending",
                typeId: ev.payload?.typeId,
                startDate: ev.payload?.startDate,
                endDate: ev.payload?.endDate,
              },
              ev.id,
              0,
              true,
            ),
            ...list,
          ];
        } catch {
          /* ignore */
        }
      }

      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leave");
    } finally {
      setLoading(false);
    }
  }, [outboxRows]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createLeave = useCallback(
    async (input: {
      typeId: string;
      startDate: string;
      endDate: string;
      urgency?: "planned" | "emergency";
      note?: string;
      partialDay?: "full" | "first_half" | "second_half" | "custom_hours";
    }) => {
      setBusy(true);
      setError(null);
      try {
        await enqueueOutbox({
          type: "leave.create",
          payload: input,
          capturedOffline: true,
        });
        await runSyncCycle();
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create leave");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const cancelLeave = useCallback(
    async (requestId: string) => {
      setBusy(true);
      try {
        await enqueueOutbox({
          type: "leave.cancel",
          payload: { requestId },
        });
        await runSyncCycle();
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not cancel");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const decideLeave = useCallback(
    async (
      requestId: string,
      decision: "approve" | "reject" | "return",
      note?: string,
    ) => {
      setBusy(true);
      try {
        await enqueueOutbox({
          type: "leave.decide",
          payload: { requestId, decision, note },
        });
        await runSyncCycle();
        await refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not decide");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  return {
    items,
    loading,
    error,
    busy,
    refresh,
    createLeave,
    cancelLeave,
    decideLeave,
  };
}
