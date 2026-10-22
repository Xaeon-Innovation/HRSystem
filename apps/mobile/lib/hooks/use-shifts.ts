import { useCallback, useEffect, useMemo, useState } from "react";
import { desc, eq } from "drizzle-orm";
import { db, isLocalDbAvailable } from "../db/client";
import { shiftInstances } from "../db/schema";
import { pullSync } from "../sync/pull";

export type LocalShift = {
  id: string;
  version: number;
  workDate: string;
  startAt: string;
  endAt: string;
  status: string;
  lateClockIn?: boolean;
  overtimeStatus?: string;
  raw: Record<string, unknown>;
};

function mapRaw(raw: Record<string, unknown>, id: string, version: number): LocalShift {
  return {
    id,
    version,
    workDate: typeof raw.workDate === "string" ? raw.workDate : "",
    startAt: typeof raw.startAt === "string" ? raw.startAt : "",
    endAt: typeof raw.endAt === "string" ? raw.endAt : "",
    status: typeof raw.status === "string" ? raw.status : "",
    lateClockIn: Boolean(raw.lateClockIn),
    overtimeStatus:
      typeof raw.overtimeStatus === "string" ? raw.overtimeStatus : undefined,
    raw,
  };
}

export function useShifts() {
  const [items, setItems] = useState<LocalShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isLocalDbAvailable) {
        const data = await pullSync();
        setItems(
          (data.changes.shiftInstances?.upserts ?? []).map((s) =>
            mapRaw(s as unknown as Record<string, unknown>, s.id, s.version),
          ),
        );
        return;
      }
      const rows = await db
        .select()
        .from(shiftInstances)
        .where(eq(shiftInstances.deleted, 0))
        .orderBy(desc(shiftInstances.updatedAt));
      setItems(
        rows.map((r) =>
          mapRaw(JSON.parse(r.json) as Record<string, unknown>, r.id, r.version),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10);
    return items.find((s) => s.workDate === d) ?? items[0] ?? null;
  }, [items]);

  return { items, today, loading, error, refresh };
}
