"use client";

import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type RecordRow = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  anomalyFlags: string[];
};

export default function AttendancePage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [note, setNote] = useState("");
  const user = typeof window !== "undefined" ? getUser() : null;

  async function load() {
    const data = await api<{ records: RecordRow[] }>("/v1/attendance/history");
    setRecords(data.records);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-sm text-muted-foreground">Clock history and corrections</p>
      </div>
      <div className="space-y-2">
        {records.map((r) => {
          const durationMs = r.clockOutAt
            ? new Date(r.clockOutAt).getTime() - new Date(r.clockInAt).getTime()
            : null;
          const hours =
            durationMs != null ? (durationMs / 36e5).toFixed(2) : "open";
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 py-3">
                <p className="text-sm font-medium">
                  In {new Date(r.clockInAt).toLocaleString()}
                  {r.clockOutAt
                    ? ` · Out ${new Date(r.clockOutAt).toLocaleString()}`
                    : " · still open"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duration: {hours}h
                  {r.anomalyFlags?.length
                    ? ` · flags: ${r.anomalyFlags.join(", ")}`
                    : ""}
                </p>
                {user?.role === "tenant_admin" ? (
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      placeholder="Correction note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        api(`/v1/attendance/${r.id}/correct`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            note: note || "Admin correction",
                            clockOutAt: new Date().toISOString(),
                          }),
                        }).then(load)
                      }
                    >
                      Close / correct
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
