"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, CalendarPlus, Siren } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { UserAvatar } from "@/components/user-avatar";
import {
  Chip,
  EmptyState,
  LegendList,
  ListRow,
  Notice,
  PageHeader,
  PersonCell,
  PillSelect,
  SegmentBar,
  Segmented,
} from "@/components/elevora";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableWrap,
} from "@/components/ui/table";
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

function patternSubtitle(p: Pattern | undefined) {
  if (!p) return null;
  if (p.cadence === "weekly") {
    const days = p.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => WEEKDAYS.find((w) => w.v === d)?.l ?? d)
      .join("–");
    return days ? `Weekly · ${days}` : t("Weekly");
  }
  if (p.cadence === "monthly") {
    return `Monthly · ${p.monthDays.join(", ") || "—"}`;
  }
  return t("Daily");
}

function formatFlagLabel(flag: string) {
  if (flag === "late in") return t("Late in");
  if (flag === "late out") return t("Late out");
  if (flag === "deduction") return t("Deduction");
  return flag;
}

export default function ShiftsAdminPage() {
  const [patternOpen, setPatternOpen] = useState(false);
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
  const [employeeFilter, setEmployeeFilter] = useState("");

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

  const patternByEmployee = useMemo(() => {
    const map = new Map<string, Pattern>();
    for (const p of patterns) {
      if (!p.active) continue;
      if (!map.has(p.employeeId)) map.set(p.employeeId, p);
    }
    return map;
  }, [patterns]);

  const activePatterns = useMemo(
    () => patterns.filter((p) => p.active),
    [patterns],
  );

  const cadenceCounts = useMemo(() => {
    let daily = 0;
    let weekly = 0;
    let monthly = 0;
    for (const p of activePatterns) {
      if (p.cadence === "daily") daily += 1;
      else if (p.cadence === "weekly") weekly += 1;
      else monthly += 1;
    }
    return { daily, weekly, monthly };
  }, [activePatterns]);

  const visibleInstances = useMemo(() => {
    if (!employeeFilter) return instances;
    return instances.filter((i) => i.employeeId === employeeFilter);
  }, [instances, employeeFilter]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [empRes, patRes, instRes, polRes, incRes, lz] = await Promise.all([
        api<{ employees: { id: string; name: string; email?: string }[] }>(
          "/v1/employees",
        ),
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
        email: e.email,
      }));
      setEmployees(list);
      if (!employeeId && list[0]) setEmployeeId(list[0].id);
      setPatterns(patRes.patterns ?? []);
      setInstances(instRes.instances ?? []);
      const nextPolicies = polRes.policies ?? [];
      setPolicies(nextPolicies);
      const global = nextPolicies.find((p) => !p.employeeId);
      if (global) {
        setBreakDuration(global.durationMinutes);
        setBreakMode(global.periodMode);
        if (global.fixedStartTime) setBreakFixedStart(global.fixedStartTime);
        if (global.fixedEndTime) setBreakFixedEnd(global.fixedEndTime);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setPatternOpen(false);
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

  const covered = activePatterns.length;

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHeader
        title={t("Shifts")}
        subtitle={t(
          "Patterns, upcoming instances, breaks and left-zone incidents.",
        )}
        actions={
          <Button
            className="w-full sm:w-auto"
            onClick={() => setPatternOpen(true)}
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {t("Set pattern")}
          </Button>
        }
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}

      <div className="grid gap-3.5 lg:grid-cols-12">
        <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface lg:col-span-8">
          <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Upcoming instances")}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {t("Next 7 days")}
              </p>
            </div>
            <PillSelect
              label={
                employeeFilter
                  ? (nameById.get(employeeFilter) ?? t("All employees"))
                  : t("All employees")
              }
              className="w-full sm:w-auto"
            >
              <select
                aria-label={t("Employee")}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              >
                <option value="">{t("All employees")}</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </PillSelect>
          </div>
          {visibleInstances.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-5 w-5" />}
              title={t("No upcoming shifts")}
              action={
                <Button
                  className="w-full sm:w-auto"
                  onClick={() => setPatternOpen(true)}
                >
                  {t("Set pattern")}
                </Button>
              }
            />
          ) : (
            <DataTableWrap>
              <DataTable className="min-w-[32rem]">
                <DataTableHead>
                  <DataTableRow className="hover:bg-transparent">
                    <DataTableHeaderCell>{t("Employee")}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t("Date")}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t("Window")}</DataTableHeaderCell>
                    <DataTableHeaderCell>{t("Flags")}</DataTableHeaderCell>
                  </DataTableRow>
                </DataTableHead>
                <DataTableBody>
                  {visibleInstances.map((i) => {
                    const flags = [
                      i.lateClockIn ? "late in" : null,
                      i.lateClockOut ? "late out" : null,
                      i.dayDeduction ? "deduction" : null,
                      i.overtimeStatus !== "none" ? i.overtimeStatus : null,
                    ].filter(Boolean) as string[];
                    const emp = employees.find((e) => e.id === i.employeeId);
                    const sub =
                      patternSubtitle(patternByEmployee.get(i.employeeId)) ??
                      emp?.email ??
                      undefined;
                    return (
                      <DataTableRow key={i.id}>
                        <DataTableCell>
                          <PersonCell
                            name={empName(employees, i.employeeId)}
                            subtitle={sub ?? undefined}
                            avatar={
                              <UserAvatar
                                name={empName(employees, i.employeeId)}
                                size="sm"
                              />
                            }
                          />
                        </DataTableCell>
                        <DataTableCell className="tabular text-ink-2">
                          {i.workDate}
                        </DataTableCell>
                        <DataTableCell className="tabular text-ink-2">
                          {new Date(i.startAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" – "}
                          {new Date(i.endAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </DataTableCell>
                        <DataTableCell>
                          {flags.length ? (
                            <span className="flex flex-wrap gap-1">
                              {flags.map((f) => (
                                <Chip key={f} tone="warn">
                                  {formatFlagLabel(f)}
                                </Chip>
                              ))}
                            </span>
                          ) : (
                            <span className="text-xs text-ink-muted">—</span>
                          )}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })}
                </DataTableBody>
              </DataTable>
            </DataTableWrap>
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-3.5 lg:col-span-4">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-ink">
              {t("Break policy")}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label>{t("Duration")}</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={480}
                    className="w-[90px] tabular"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                  />
                  <span className="text-sm text-ink-muted">{t("minutes")}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("Window")}</Label>
                <Segmented
                  className="w-full max-w-full overflow-x-auto"
                  value={breakMode}
                  onChange={(v) => setBreakMode(v as "fixed" | "flexible")}
                  options={[
                    {
                      value: "fixed",
                      label: `${t("Fixed")} ${breakFixedStart}`,
                    },
                    { value: "flexible", label: t("Employee chooses") },
                  ]}
                />
              </div>
              {breakMode === "fixed" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                </div>
              ) : null}
              <Button
                className="w-full sm:w-auto"
                size="sm"
                disabled={busy}
                onClick={() => void saveBreakPolicy(true)}
              >
                {t("Save")}
              </Button>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Active patterns")}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {covered}{" "}
                {covered === 1 ? t("employee covered") : t("employees covered")}
              </p>
            </div>
            {covered === 0 ? (
              <p className="text-sm text-ink-muted">{t("No patterns yet")}</p>
            ) : (
              <>
                <LegendList
                  items={(
                    [
                      {
                        label: t("Weekly"),
                        value: cadenceCounts.weekly,
                        tone: "accent" as const,
                      },
                      {
                        label: t("Daily"),
                        value: cadenceCounts.daily,
                        tone: "yellow" as const,
                      },
                      {
                        label: t("Monthly"),
                        value: cadenceCounts.monthly,
                        tone: "warn" as const,
                      },
                    ] as const
                  ).filter((item) => item.value > 0)}
                />
                <SegmentBar
                  className="mt-3"
                  segments={(
                    [
                      {
                        value: cadenceCounts.weekly || 0,
                        tone: "accent" as const,
                      },
                      {
                        value: cadenceCounts.daily || 0,
                        tone: "yellow" as const,
                      },
                      {
                        value: cadenceCounts.monthly || 0,
                        tone: "warn" as const,
                      },
                    ] as const
                  ).filter((s) => s.value > 0)}
                />
              </>
            )}
          </section>
        </div>

        <section className="min-w-0 rounded-lg border border-line bg-surface px-5 lg:col-span-12">
          <div className="border-b border-line py-4">
            <h2 className="text-[15px] font-semibold text-ink">
              {t("Left-zone incidents")}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">
              {t("Approve as emergency or mark a day deduction")}
            </p>
          </div>
          {incidents.length === 0 ? (
            <p className="py-6 text-sm text-ink-muted">
              {t("No pending left-zone incidents.")}
            </p>
          ) : (
            incidents.map((inc) => {
              const name = nameById.get(inc.employeeId) ?? inc.employeeId;
              const when = new Date(inc.detectedAt);
              const dayLabel = when.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              return (
                <ListRow
                  key={inc.id}
                  leading={<UserAvatar name={name} size="sm" />}
                  title={name}
                  subtitle={`${inc.phase.replaceAll("_", " ")} · ${when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                  value={
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                      <span className="hidden text-xs text-ink-muted sm:inline">
                        {dayLabel}
                      </span>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() =>
                          void resolveIncident(inc.id, "approved_emergency")
                        }
                      >
                        <Siren className="h-3.5 w-3.5" aria-hidden />
                        {t("Approve emergency")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() => setPendingDeduction(inc)}
                      >
                        {t("Mark deduction")}
                      </Button>
                    </div>
                  }
                />
              );
            })
          )}
        </section>

        <section className="min-w-0 rounded-lg border border-line bg-surface p-5 lg:col-span-12">
          <h2 className="text-[15px] font-semibold text-ink">
            {t("Left-zone policy")}
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                className="flex h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm"
                value={leftZoneResolution}
                onChange={(e) => setLeftZoneResolution(e.target.value)}
              >
                <option value="require_admin">
                  {t("Require admin decision")}
                </option>
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
          </div>
        </section>
      </div>

      <Sheet
        open={patternOpen}
        onOpenChange={(open) => {
          if (!open && busy) return;
          setPatternOpen(open);
        }}
      >
        <SheetContent className="max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("Set pattern")}</SheetTitle>
            <SheetDescription>
              {t("Daily, weekly, or monthly windows for an employee.")}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <form
              onSubmit={(e) => void createPattern(e)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("Employee")}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm"
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t("Cadence")}</Label>
                <Segmented
                  className="w-full"
                  value={cadence}
                  onChange={(v) =>
                    setCadence(v as "daily" | "weekly" | "monthly")
                  }
                  options={[
                    { value: "daily", label: t("Daily") },
                    { value: "weekly", label: t("Weekly") },
                    { value: "monthly", label: t("Monthly") },
                  ]}
                />
              </div>
              {cadence === "daily" ? (
                <div className="space-y-1.5 sm:col-span-2">
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
                <div className="space-y-1.5 sm:col-span-2">
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
              <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => setPatternOpen(false)}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={busy}
                >
                  {t("Create pattern")}
                </Button>
              </div>
            </form>

            <div className="border-t border-line pt-4">
              <p className="text-sm font-semibold text-ink">
                {t("Active patterns")}
              </p>
              <div className="mt-3 space-y-2">
                {patterns.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("No patterns yet")}</p>
                ) : (
                  patterns.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 rounded-sm border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm text-ink-2">
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
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <p className="text-sm font-semibold text-ink">
                {t("Per-employee break override")}
              </p>
              <div className="mt-3 space-y-2">
                <select
                  className="flex h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-sm"
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
                  className="w-full sm:w-auto"
                  variant="outline"
                  size="sm"
                  disabled={busy || !breakEmployeeId}
                  onClick={() => void saveBreakPolicy(false)}
                >
                  {t("Save employee break policy")}
                </Button>
                {policies.length > 0 ? (
                  <ul className="space-y-1 text-sm text-ink-muted">
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
              </div>
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingDeduction)}
        title={t("Mark day deduction?")}
        description={t(
          "This closes the day for the employee and blocks re-clock-in.",
        )}
        confirmLabel={t("Mark deduction")}
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
