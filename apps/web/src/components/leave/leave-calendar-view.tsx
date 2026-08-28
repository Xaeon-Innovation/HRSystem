"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eachDate, isWeekend, monthGrid } from "@/lib/leave/days";
import { formatDate, parseIsoDate, rangesOverlap, SELECT_CLASS, todayIso, toIsoDate } from "@/lib/leave/format";
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
  const [department, setDepartment] = useState("");
  const [selected, setSelected] = useState(todayIso());
  const departments = [...new Set(employees.map((e) => e.department))].sort();
  const holidays = policies[0]?.holidays ?? [];
  const blackouts = policies.flatMap((p) => p.blackoutDates);
  const weekendRule = policies[0]?.weekendRule ?? "sat_sun";

  const filteredEvents = useMemo(
    () => events.filter((e) => !department || e.department === department),
    [events, department],
  );

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
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Team calendar</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className={cn(SELECT_CLASS, "w-40")}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Previous month"
                  onClick={() => setCursor(shiftMonth(cursor, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <p className="min-w-32 text-center text-sm font-medium">{monthLabel}</p>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Next month"
                  onClick={() => setCursor(shiftMonth(cursor, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((iso) => {
                const inMonth = iso.slice(0, 7) === cursor.slice(0, 7);
                const off = peopleOffOn(filteredEvents, iso);
                const holiday = holidays.find((h) => h.date === iso);
                const blackout = blackouts.find((b) => rangesOverlap(iso, iso, b.startDate, b.endDate));
                const weekend = isWeekend(iso, weekendRule);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelected(iso)}
                    className={cn(
                      "min-h-[72px] rounded-lg border p-1.5 text-left transition",
                      inMonth ? "bg-white" : "bg-secondary/40 text-muted-foreground",
                      selected === iso && "ring-2 ring-ring",
                      iso === todayIso() && "border-primary/40",
                      weekend && "bg-slate-50",
                      holiday && "bg-amber-50",
                      blackout && "bg-rose-50",
                    )}
                  >
                    <span className="text-xs font-medium">{parseIsoDate(iso).getDate()}</span>
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {off.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: e.color }}
                          title={e.employeeName}
                        />
                      ))}
                      {off.length > 3 ? (
                        <span className="text-[10px] text-muted-foreground">+{off.length - 3}</span>
                      ) : null}
                    </div>
                    {holiday ? (
                      <p className="mt-1 truncate text-[10px] text-amber-800">{holiday.name}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Off today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {offToday.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nobody is off today.</p>
              ) : (
                offToday.map((e) => <PersonRow key={e.id} event={e} onOpen={onOpen} />)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{formatDate(selected)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {holidayOn(selected, holidays) ? (
                <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
                  Public holiday: {holidayOn(selected, holidays)}
                </p>
              ) : null}
              {blackoutOn(selected, blackouts) ? (
                <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-900">
                  Restricted: {blackoutOn(selected, blackouts)}
                </p>
              ) : null}
              {staffing ? (
                <p className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-950">{staffing}</p>
              ) : null}
              {selectedOff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved leave on this day.</p>
              ) : (
                selectedOff.map((e) => <PersonRow key={e.id} event={e} onOpen={onOpen} />)
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming approved leave.</p>
              ) : (
                upcoming.map((e) => <PersonRow key={e.id} event={e} onOpen={onOpen} extra />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
      className="flex w-full items-start justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-secondary/40"
    >
      <span>
        <span className="font-medium">{event.employeeName}</span>
        <span className="block text-xs text-muted-foreground">
          {event.leaveTypeName} · {event.department}
        </span>
      </span>
      {extra ? (
        <span className="text-xs tabular-nums text-muted-foreground">{formatDate(event.startDate)}</span>
      ) : null}
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
      return `${count} people in ${dept} are off — staffing is thin.`;
    }
  }
  return null;
}
