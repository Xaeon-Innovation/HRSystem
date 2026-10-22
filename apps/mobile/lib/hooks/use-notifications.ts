import { useCallback, useEffect, useState } from "react";
import { desc, eq } from "drizzle-orm";
import { db, isLocalDbAvailable } from "../db/client";
import { notifications } from "../db/schema";
import { runSyncCycle } from "../sync/engine";
import { enqueueOutbox } from "../sync/outbox";
import { pullSync } from "../sync/pull";

export type LocalNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  category?: string | null;
  updatedAt?: string;
};

export function useNotifications() {
  const [items, setItems] = useState<LocalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isLocalDbAvailable) {
        const data = await pullSync();
        setItems(
          (data.changes.notifications?.upserts ?? []).map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            read: n.read,
            category: n.category,
            updatedAt: n.updatedAt,
          })),
        );
        return;
      }
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.deleted, 0))
        .orderBy(desc(notifications.updatedAt));
      setItems(
        rows.map((r) => {
          const raw = JSON.parse(r.json) as LocalNotification;
          return {
            id: r.id,
            type: raw.type,
            title: raw.title,
            body: raw.body,
            read: Boolean(raw.read),
            category: raw.category,
            updatedAt: r.updatedAt,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markRead = useCallback(
    async (notificationId: string) => {
      await enqueueOutbox({
        type: "notification.read",
        payload: { notificationId },
      });
      await runSyncCycle();
      await refresh();
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    await enqueueOutbox({ type: "notification.readAll" });
    await runSyncCycle();
    await refresh();
  }, [refresh]);

  return {
    items,
    unread: items.filter((n) => !n.read).length,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}
