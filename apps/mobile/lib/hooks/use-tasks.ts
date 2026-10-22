import { useCallback, useEffect, useState } from "react";
import { asc, eq } from "drizzle-orm";
import { db, isLocalDbAvailable } from "../db/client";
import { tasks } from "../db/schema";
import { pullSync } from "../sync/pull";

export type LocalTask = {
  id: string;
  version: number;
  title?: string;
  status?: string;
  raw: Record<string, unknown>;
};

/** Open / active tasks for tab + Today badges. */
export function isActiveTask(status: string | undefined | null) {
  return (
    status === "open" ||
    status === "in_progress" ||
    status === "submitted" ||
    status === "changes_requested"
  );
}

export function countActiveTasks(items: LocalTask[]) {
  return items.filter((t) => isActiveTask(t.status)).length;
}

export function useTasks() {
  const [items, setItems] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isLocalDbAvailable) {
        // Web: pull once and surface upserts without persistence.
        const data = await pullSync();
        setItems(
          (data.changes.tasks?.upserts ?? []).map((t) => ({
            id: t.id,
            version: t.version,
            title: t.title,
            status: t.status,
            raw: t as unknown as Record<string, unknown>,
          })),
        );
        return;
      }
      const rows = await db
        .select()
        .from(tasks)
        .where(eq(tasks.deleted, 0))
        .orderBy(asc(tasks.updatedAt));
      setItems(
        rows.map((r) => {
          const raw = JSON.parse(r.json) as Record<string, unknown>;
          return {
            id: r.id,
            version: r.version,
            title: typeof raw.title === "string" ? raw.title : "",
            status: typeof raw.status === "string" ? raw.status : "",
            raw,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
