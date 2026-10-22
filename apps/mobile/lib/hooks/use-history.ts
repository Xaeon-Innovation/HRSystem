import { useCallback, useEffect, useState } from "react";
import { desc, eq } from "drizzle-orm";
import { db, isLocalDbAvailable } from "../db/client";
import { clockSessions } from "../db/schema";
import { pullSync } from "../sync/pull";

export type HistoryRow = {
  id: string;
  clockInAt: string | null;
  clockOutAt: string | null;
  source?: string;
  flags: string[];
};

export function useHistory() {
  const [items, setItems] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isLocalDbAvailable) {
        const data = await pullSync();
        setItems(
          (data.changes.clockSessions?.upserts ?? []).map((s) => ({
            id: s.id,
            clockInAt: s.clockInAt ?? null,
            clockOutAt: s.clockOutAt ?? null,
            source: s.source,
            flags: s.anomalyFlags ?? [],
          })),
        );
        return;
      }
      const rows = await db
        .select()
        .from(clockSessions)
        .where(eq(clockSessions.deleted, 0))
        .orderBy(desc(clockSessions.updatedAt))
        .limit(40);
      setItems(
        rows.map((r) => {
          const raw = JSON.parse(r.json) as {
            clockInAt?: string;
            clockOutAt?: string | null;
            source?: string;
            anomalyFlags?: string[];
          };
          return {
            id: r.id,
            clockInAt: raw.clockInAt ?? null,
            clockOutAt: raw.clockOutAt ?? null,
            source: raw.source,
            flags: raw.anomalyFlags ?? [],
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
