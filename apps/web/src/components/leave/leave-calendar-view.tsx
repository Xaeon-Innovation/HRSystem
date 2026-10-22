"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarMonth, EmptyState, ListRow, Notice, PillSelect } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { eachDate, monthGrid } from "@/lib/leave/days";
import { formatDate, parseIsoDate, rangesOverlap, statusLabel, todayIso, toIsoDate } from "@/lib/leave/format";
import { peopleOffOn } from "@/lib/leave/reports";
import type {
  LeaveBlackout,
  LeaveCalendarEvent,
  LeaveEmployee,
  LeaveHoliday,
  LeavePolicy,
  LeaveRequest,
} from "@/lib/leave/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

type HatchEvTone = "accent" | "warn" | "idle" | "yellow" | "soft";

function leaveHatchTone(name: string): HatchEvTone {
  const n = name.toLowerCase();
  if (n.includes("sick")) return "yellow";
  if (n.includes("wfh") || n.includes("work from home") || n.includes("remote")) return "soft";
  if (n.includes("annual") || n.includes("vacation")) return "warn";
  if (n.includes("comp")) return "accent";
  return "accent";
}

export function LeaveCalendarView({
  events,
  employees,
  policies,
  requests,
  onOpen,
}: {
  events: LeaveCalendarEvent[];
  employees: LeaveEmployee[];
  policies: LeavePolicy[];
  requests: LeaveRequest[];
  onOpen: (requestId: string) => void;
}) {
  const [cursor, setCursor] = useState(() => todayIso().slice(0, 7) + "-01");
  const [branchId, setBranchId] = useState("");
  const [selected, setSelected] = useState(todayIso());
  const branches = [...new Map(employees.map((e) => [e.branchId, e.branchName])).entries()];
  const holidays = policies[0]?.holidays ?? [];
  const blackouts = policies.flatMap((p) => p.blackoutDates);
  const branchName = branches.find(([id]) => id === branchId)?.[1] ?? "";
  const branchLabel = branchName || t("All branches");

  const filteredEvents = useMemo(
    () => events.filter((e) => !branchId || e.branchName === branchName),
    [events, branchId, branchName],
  );

  const legend = useMemo(() => {
    const seen = new Map<string, HatchEvTone>();
    for (const e of events) {
      if (!seen.has(e.leaveTypeName)) seen.set(e.leaveTypeName, leaveHatchTone(e.leaveTypeName));
    }
    return [...seen.entries()].slice(0, 6);
  }, [events]);

  const days = monthGrid(cursor);
  const monthLabel = parseIsoDate(cursor).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const offToday = peopleOffOn(filteredEvents, todayIso());
  const selectedOff = peopleOffOn(filteredEvents, selected);
  const upcoming = filteredEvents
    .filter((e) => e.status === "approved" && e.startDate > todayIso())
    .slice(0, 6);

  const staffing = staffingWarnings(requests, employees, selected);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-sm border border-line bg-surface lg:col-span-2">
          <div className="border-b border-line px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-ink">{monthLabel}</h2>
                <p className="text-xs text-ink-muted">{t("Who is out, by day")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("Previous month")}
                  onClick={() => setCursor(shiftMonth(cursor, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label={t("Next month")}
                  onClick={() => setCursor(shiftMonth(cursor, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <PillSelect label={branchLabel} className="w-full sm:w-auto">
                  <select
                    aria-label={t("Branch")}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">{t("All branches")}</option>
                    {branches.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </PillSelect>
              </div>
            </div>
          </div>
          <div className="p-4">
            {legend.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-3">
                {legend.map(([name, tone]) => (
                  <span key={name} className="inline-flex items-center gap-1.5 text-2xs text-ink-muted">
                    <i
                      className={cn(
                        "inline-block h-2.5 w-4 rounded-[2px]",
                        tone === "warn" && "hatch-warn",
                        tone === "yellow" && "hatch-yellow",
                        tone === "soft" && "hatch-soft",
                        tone === "accent" && "hatch",
                        tone === "idle" && "hatch-idle",
                      )}
                    />
                    {name}
                  </span>
                ))}
              </div>
            ) : null}
            <CalendarMonth
              weekdayLabels={[t("Sun"), t("Mon"), t("Tue"), t("Wed"), t("Thu"), t("Fri"), t("Sat")]}
              days={days.map((iso) => {
                const inMonth = iso.slice(0, 7) === cursor.slice(0, 7);
                const off = peopleOffOn(filteredEvents, iso);
                return {
                  date: parseIsoDate(iso).getDate(),
                  isToday: iso === todayIso(),
                  isOutside: !inMonth,
                  events: off.slice(0, 2).map((e) => ({
                    id: e.id,
                    label: `${e.employeeName.split(" ")[0] ?? e.employeeName} · ${e.leaveTypeName.split(" ")[0] ?? e.leaveTypeName}`,
                    tone: leaveHatchTone(e.leaveTypeName),
                  })),
                };
              })}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {days.map((iso) => {
                const inMonth = iso.slice(0, 7) === cursor.slice(0, 7);
                if (!inMonth) return null;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "min-h-10 min-w-10 rounded-[8px] px-2 py-1 text-2xs tabular-nums transition",
                      selected === iso
                        ? "bg-surface-3 font-semibold text-ink ring-1 ring-ink"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    {parseIsoDate(iso).getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <SidePanel title={t("Off today")}>
            {offToday.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title={t("Nobody is off today.")}
                className="py-6"
              />
            ) : (
              offToday.map((e) => <PersonRow key={e.id} event={e} onOpen={onOpen} />)
            )}
          </SidePanel>
          <SidePanel title={formatDate(selected)}>
            {holidayOn(selected, holidays) ? (
              <Notice tone="warn" className="mb-2">
                {t("Public holiday:")} {holidayOn(selected, holidays)}
              </Notice>
            ) : null}
            {blackoutOn(selected, blackouts) ? (
              <Notice tone="warn" className="mb-2">
                {t("Restricted:")} {blackoutOn(selected, blackouts)}
              </Notice>
            ) : null}
            {staffing ? (
              <Notice tone="warn" className="mb-2">
                {staffing}
              </Notice>
            ) : null}
            {selectedOff.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title={t("No approved leave on this day.")}
                className="py-6"
              />
            ) : (
              selectedOff.map((e) => <PersonRow key={e.id} event={e} onOpen={onOpen} />)
            )}
          </SidePanel>
          <SidePanel title={t("Upcoming")}>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title={t("No upcoming approved leave.")}
                className="py-6"
              />
            ) : (
              upcoming.map((e) => (
                <PersonRow key={e.id} event={e} onOpen={onOpen} extra />
              ))
            )}
          </SidePanel>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-sm border border-line bg-surface">
      <h3 className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">{title}</h3>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function PersonRow({
  event,
  onOpen,
  extra,
}: {
  event: LeaveCalendarEvent;
  onOpen: (id: string) => void;
  extra?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(event.requestId)}
      className="block w-full text-left"
    >
      <ListRow
        title={event.employeeName}
        subtitle={`${event.leaveTypeName} · ${event.department}`}
        value={extra ? formatDate(event.startDate) : undefined}
        status={statusLabel(event.status)}
      />
    </button>
  );
}

function shiftMonth(iso: string, delta: number): string {
  const d = parseIsoDate(iso);
  d.setMonth(d.getMonth() + delta);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function holidayOn(iso: string, holidays: LeaveHoliday[]) {
  return holidays.find((h) => h.date === iso)?.name;
}

function blackoutOn(iso: string, blackouts: LeaveBlackout[]) {
  return blackouts.find((b) => rangesOverlap(iso, iso, b.startDate, b.endDate))?.label;
}

function staffingWarnings(
  requests: LeaveRequest[],
  employees: LeaveEmployee[],
  iso: string,
): string | null {
  const byDept = new Map<string, number>();
  for (const r of requests) {
    if (r.status !== "approved") continue;
    if (!eachDate(r.startDate, r.endDate).includes(iso)) continue;
    byDept.set(r.department, (byDept.get(r.department) ?? 0) + 1);
  }
  for (const [dept, count] of byDept) {
    const size = employees.filter((e) => e.department === dept).length;
    if (count >= 2 && size > 0 && count / size >= 0.4) {
      return `${count} people in ${dept} are off, staffing is thin.`;
    }
  }
  return null;
}
