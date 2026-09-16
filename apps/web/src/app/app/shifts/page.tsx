"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type Employee = { id: string; name: string; email?: string };
type Pattern = {
  id: string;
  employeeId: string;
  cadence: "daily" | "weekly" | "monthly";
  workDate: string | null;
  weekdays: number[];
  monthDays: number[];
  startTime: string;
  endTime: string;
  active: boolean;
};
type Instance = {
  id: string;
  employeeId: string;
  workDate: string;
  startAt: string;
  endAt: string;
  lateClockIn: boolean;
  lateClockOut: boolean;
  overtimeStatus: string;
  dayDeduction: boolean;
  status: string;
};
type BreakPolicy = {
  id: string;
  employeeId: string | null;
  enabled: boolean;
  durationMinutes: number;
  periodMode: "fixed" | "flexible";
  fixedStartTime: string | null;
  fixedEndTime: string | null;
  maxBreaksPerShift: number;
};
type Incident = {
  id: string;
  employeeId: string;
  phase: string;
  status: string;
  detectedAt: string;
  lat: number;
  lng: number;
};

const WEEKDAYS = [
  { v: 0, l: "Sun" },
  { v: 1, l: "Mon" },
  { v: 2, l: "Tue" },
  { v: 3, l: "Wed" },
  { v: 4, l: "Thu" },
  { v: 5, l: "Fri" },
  { v: 6, l: "Sat" },
];

function empName(employees: Employee[], id: string) {
  return employees.find((e) => e.id === id)?.name ?? id.slice(0, 8);
}

export default function ShiftsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [policies, setPolicies] = useState<BreakPolicy[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [leftZoneAuto, setLeftZoneAuto] = useState(true);
  const [leftZoneResolution, setLeftZoneResolution] =
    useState("require_admin");
  const [busy, setBusy] = useState(false);
  const [pendingDeduction, setPendingDeduction] = useState<Incident | null>(
    null,
  );

  const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">(
    "daily",
  );
  const [employeeId, setEmployeeId] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDays, setMonthDays] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  const [breakDuration, setBreakDuration] = useState(60);
  const [breakMode, setBreakMode] = useState<"fixed" | "flexible">("flexible");
  const [breakFixedStart, setBreakFixedStart] = useState("12:00");
  const [breakFixedEnd, setBreakFixedEnd] = useState("13:00");
  const [breakEmployeeId, setBreakEmployeeId] = useState("");

  const nameById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [empRes, patRes, instRes, polRes, incRes, lz] = await Promise.all([
        api<{ employees: { id: string; name: string }[] }>("/v1/employees"),
        api<{ patterns: Pattern[] }>("/v1/shifts/patterns"),
        api<{ instances: Instance[] }>("/v1/shifts/instances"),
        api<{ policies: BreakPolicy[] }>("/v1/shifts/break-policies"),
        api<{ incidents: Incident[] }>(
          "/v1/shifts/left-zone-incidents?status=pending",
        ),
        api<{
          leftZoneAutoClockOut: boolean;
          leftZoneResolution: string;
        }>("/v1/shifts/settings/left-zone"),
      ]);

      const list = (empRes.employees ?? []).map((e) => ({
        id: e.id,
        name: e.name,
      }));
      setEmployees(list);
      if (!employeeId && list[0]) setEmployeeId(list[0].id);
      setPatterns(patRes.patterns ?? []);
      setInstances(instRes.instances ?? []);
      setPolicies(polRes.policies ?? []);
      setIncidents(incRes.incidents ?? []);
      setLeftZoneAuto(lz.leftZoneAutoClockOut !== false);
      setLeftZoneResolution(lz.leftZoneResolution ?? "require_admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createPattern(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/v1/shifts/patterns", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          cadence,
          workDate: cadence === "daily" ? workDate : null,
          weekdays: cadence === "weekly" ? weekdays : [],
          monthDays:
            cadence === "monthly"
              ? monthDays
                  .split(/[,\s]+/)
                  .map((n) => Number(n))
                  .filter((n) => n >= 1 && n <= 31)
              : [],
          startTime,
          endTime,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveBreakPolicy(global: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/v1/shifts/break-policies", {
        method: "PUT",
        body: JSON.stringify({
          employeeId: global ? null : breakEmployeeId || null,
          enabled: true,
          durationMinutes: breakDuration,
          periodMode: breakMode,
          fixedStartTime: breakMode === "fixed" ? breakFixedStart : null,
          fixedEndTime: breakMode === "fixed" ? breakFixedEnd : null,
          maxBreaksPerShift: 1,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveLeftZoneSettings() {
    setBusy(true);
    try {
      await api("/v1/shifts/settings/left-zone", {
        method: "PATCH",
        body: JSON.stringify({
          leftZoneAutoClockOut: leftZoneAuto,
          leftZoneResolution,
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function resolveIncident(
    id: string,
    resolution: "approved_emergency" | "day_deduction",
  ) {
    setBusy(true);
    try {
      await api(`/v1/shifts/left-zone-incidents/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution }),
      });
      setPendingDeduction(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Shifts")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Schedule shifts, breaks, and left-zone policy for your roster",
            )}
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => void load()}
        >
          {t("Refresh")}
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {incidents.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("Left-zone incidents")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    {nameById.get(inc.employeeId) ?? inc.employeeId}
                  </p>
                  <p className="text-muted-foreground">
                    {inc.phase.replaceAll("_", " ")} ·{" "}
                    {new Date(inc.detectedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="w-full sm:w-auto"
                    disabled={busy}
                    onClick={() =>
                      void resolveIncident(inc.id, "approved_emergency")
                    }
                  >
                    {t("Approve emergency")}
                  </Button>
                  <Button
                    className="w-full sm:w-auto"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => setPendingDeduction(inc)}
                  >
                    {t("Day deduction")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("Add shift pattern")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => void createPattern(e)}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("Employee")}</Label>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("Cadence")}</Label>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={cadence}
                onChange={(e) =>
                  setCadence(e.target.value as typeof cadence)
                }
              >
                <option value="daily">{t("Daily")}</option>
                <option value="weekly">{t("Weekly")}</option>
                <option value="monthly">{t("Monthly")}</option>
              </select>
            </div>
            {cadence === "daily" ? (
              <div className="space-y-1.5">
                <Label>{t("Work date")}</Label>
                <Input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  required
                />
              </div>
            ) : null}
            {cadence === "weekly" ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("Weekdays")}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <label
                      key={d.v}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={weekdays.includes(d.v)}
                        onChange={(e) => {
                          setWeekdays((prev) =>
                            e.target.checked
                              ? [...prev, d.v]
                              : prev.filter((x) => x !== d.v),
                          );
                        }}
                      />
                      {d.l}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            {cadence === "monthly" ? (
              <div className="space-y-1.5">
                <Label>{t("Days of month")}</Label>
                <Input
                  value={monthDays}
                  onChange={(e) => setMonthDays(e.target.value)}
                  placeholder="1, 15"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>{t("Start time")}</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("End time")}</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={busy}
              >
                {t("Create pattern")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Break policy")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("Duration (minutes)")}</Label>
            <Input
              type="number"
              min={5}
              max={480}
              value={breakDuration}
              onChange={(e) => setBreakDuration(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Period mode")}</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={breakMode}
              onChange={(e) =>
                setBreakMode(e.target.value as "fixed" | "flexible")
              }
            >
              <option value="flexible">{t("Employee chooses")}</option>
              <option value="fixed">{t("Fixed period")}</option>
            </select>
          </div>
          {breakMode === "fixed" ? (
            <>
              <div className="space-y-1.5">
                <Label>{t("Break start")}</Label>
                <Input
                  type="time"
                  value={breakFixedStart}
                  onChange={(e) => setBreakFixedStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("Break end")}</Label>
                <Input
                  type="time"
                  value={breakFixedEnd}
                  onChange={(e) => setBreakFixedEnd(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void saveBreakPolicy(true)}
            >
              {t("Save global break policy")}
            </Button>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Per-employee override")}</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={breakEmployeeId}
              onChange={(e) => setBreakEmployeeId(e.target.value)}
            >
              <option value="">{t("Select employee")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <Button
              className="mt-2 w-full sm:w-auto"
              variant="outline"
              disabled={busy || !breakEmployeeId}
              onClick={() => void saveBreakPolicy(false)}
            >
              {t("Save employee break policy")}
            </Button>
          </div>
          {policies.length > 0 ? (
            <ul className="space-y-1 text-sm text-muted-foreground sm:col-span-2">
              {policies.map((p) => (
                <li key={p.id}>
                  {p.employeeId
                    ? empName(employees, p.employeeId)
                    : t("Global")}
                  : {p.durationMinutes}m · {p.periodMode}
                  {!p.enabled ? ` (${t("disabled")})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Left-zone policy")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={leftZoneAuto}
              onChange={(e) => setLeftZoneAuto(e.target.checked)}
            />
            {t("Auto clock-out when leaving work zone (not on break)")}
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Default resolution")}</Label>
            <select
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={leftZoneResolution}
              onChange={(e) => setLeftZoneResolution(e.target.value)}
            >
              <option value="require_admin">{t("Require admin decision")}</option>
              <option value="auto_approve_emergency">
                {t("Auto-approve emergency (allow re-clock)")}
              </option>
              <option value="auto_day_deduction">
                {t("Auto day deduction")}
              </option>
            </select>
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void saveLeftZoneSettings()}
          >
            {t("Save left-zone settings")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Active patterns")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 overflow-x-auto">
          {patterns.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No patterns yet")}</p>
          ) : (
            <ul className="min-w-0 space-y-2 text-sm">
              {patterns.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    {empName(employees, p.employeeId)} · {p.cadence} ·{" "}
                    {p.startTime}–{p.endTime}
                    {p.workDate ? ` · ${p.workDate}` : ""}
                    {!p.active ? ` (${t("inactive")})` : ""}
                  </span>
                  {p.active ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() =>
                        void api(`/v1/shifts/patterns/${p.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ active: false }),
                        }).then(load)
                      }
                    >
                      {t("Deactivate")}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Upcoming instances")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {instances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No upcoming shifts")}
            </p>
          ) : (
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-2">{t("Employee")}</th>
                  <th className="py-2 pr-2">{t("Date")}</th>
                  <th className="py-2 pr-2">{t("Window")}</th>
                  <th className="py-2">{t("Flags")}</th>
                </tr>
              </thead>
              <tbody>
                {instances.map((i) => (
                  <tr key={i.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      {empName(employees, i.employeeId)}
                    </td>
                    <td className="py-2 pr-2">{i.workDate}</td>
                    <td className="py-2 pr-2">
                      {new Date(i.startAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      –
                      {new Date(i.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2">
                      {[
                        i.lateClockIn ? t("late in") : null,
                        i.lateClockOut ? t("late out") : null,
                        i.dayDeduction ? t("deduction") : null,
                        i.overtimeStatus !== "none" ? i.overtimeStatus : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDeduction)}
        title={t("Mark day deduction?")}
        description={t(
          "This closes the day for the employee and blocks re-clock-in.",
        )}
        confirmLabel={t("Day deduction")}
        variant="destructive"
        busy={busy}
        onConfirm={() => {
          if (pendingDeduction) {
            void resolveIncident(pendingDeduction.id, "day_deduction");
          }
        }}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingDeduction(null);
        }}
      />
    </div>
  );
}
