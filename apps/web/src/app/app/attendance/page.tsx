"use client";

import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import { t } from "@/i18n";

type RecordRow = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  anomalyFlags: string[];
};

type EmployeeOption = {
  id: string;
  name: string;
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-xs";

export default function AttendancePage() {
  const redesign = useUiRedesign();
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [note, setNote] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = user?.role === "tenant_admin";

  async function load(forEmployeeId?: string) {
    setError(null);
    const q =
      isAdmin && forEmployeeId
        ? `?employeeId=${encodeURIComponent(forEmployeeId)}`
        : "";
    const data = await api<{ records: RecordRow[] }>(
      `/v1/attendance/history${q}`,
    );
    setRecords(data.records);
  }

  useEffect(() => {
    void load(employeeId || undefined).catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load"),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin || !redesign) return;
    void api<{ employees: EmployeeOption[] }>("/v1/employees")
      .then((res) => setEmployees(res.employees ?? []))
      .catch(() => setEmployees([]));
  }, [isAdmin, redesign]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Attendance")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Clock history and corrections")}</p>
        </div>
        {redesign && isAdmin ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              className={selectClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">{t("All / recent (tenant)")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() =>
                void load(employeeId || undefined).catch((err) =>
                  setError(err instanceof Error ? err.message : t("Failed")),
                )
              }
            >
              {t("Load history")}</Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="space-y-2">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No attendance records.")}</p>
        ) : null}
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
                  {t("In")} {new Date(r.clockInAt).toLocaleString()}
                  {r.clockOutAt
                    ? ` · Out ${new Date(r.clockOutAt).toLocaleString()}`
                    : t(" · still open")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Duration:")}{hours}h
                  {r.anomalyFlags?.length
                    ? ` · flags: ${r.anomalyFlags.join(", ")}`
                    : ""}
                </p>
                {isAdmin ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder={t("Correction note")}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        api(`/v1/attendance/${r.id}/correct`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            note: note || t("Admin correction"),
                            clockOutAt: new Date().toISOString(),
                          }),
                        }).then(() => load(employeeId || undefined))
                      }
                    >
                      {t("Close / correct")}</Button>
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
