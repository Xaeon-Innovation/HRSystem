import { useCallback, useState } from "react";
import type { TaskStatus } from "@hr/shared";
import { runSyncCycle } from "../sync/engine";
import { enqueueOutbox } from "../sync/outbox";

export function useTaskActions(onDone?: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      setBusy(true);
      setError(null);
      try {
        await enqueueOutbox({
          type: "task.status",
          payload: { taskId, status },
        });
        const cycle = await runSyncCycle();
        if (cycle.error) throw new Error(cycle.error);
        await onDone?.();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Task update failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  const review = useCallback(
    async (
      taskId: string,
      decision: "accept" | "request_changes",
      note?: string,
    ) => {
      setBusy(true);
      setError(null);
      try {
        await enqueueOutbox({
          type: "task.review",
          payload: { taskId, decision, note },
        });
        const cycle = await runSyncCycle();
        if (cycle.error) throw new Error(cycle.error);
        await onDone?.();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Review failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  const addComment = useCallback(
    async (taskId: string, body: string) => {
      setBusy(true);
      setError(null);
      try {
        await enqueueOutbox({
          type: "task.comment",
          payload: { taskId, body },
        });
        await runSyncCycle();
        await onDone?.();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Comment failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onDone],
  );

  return { busy, error, setStatus, review, addComment };
}
