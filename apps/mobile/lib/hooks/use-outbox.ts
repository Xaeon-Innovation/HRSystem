import { useCallback, useEffect, useState } from "react";
import {
  discardOutboxEvent,
  listOutbox,
  pendingOutboxCount,
  pushOutbox,
  retryOutboxEvent,
} from "../sync/outbox";

export function useOutbox() {
  const [pending, setPending] = useState(0);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listOutbox>>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setPending(await pendingOutboxCount());
    setRows(await listOutbox());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const push = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await pushOutbox();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Push failed");
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return {
    pending,
    rows,
    busy,
    error,
    refresh,
    push,
    discard: async (id: string) => {
      await discardOutboxEvent(id);
      await refresh();
    },
    retry: async (id: string) => {
      await retryOutboxEvent(id);
      await refresh();
    },
  };
}
