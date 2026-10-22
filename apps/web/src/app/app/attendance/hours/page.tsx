"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, FileSpreadsheet } from "lucide-react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { UserAvatar } from "@/components/user-avatar";
import {
  formatMinutesAsDecimalHours,
  toIsoDate,
} from "@/components/attendance/format";
import {
  HoursWeekStrip,
  monthWeeks,
  weekOfMonth,
} from "@/components/attendance/week-strip";
import { t, intlDateOptions, intlLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  Chip,
  EmptyState,
  PageHeader,
  PersonCell,
  Segmented,
  StatBlock,
} from "@/components/elevora";

type HoursRow = {
  employeeId: string;
  name: string;
  day: string;
  shiftMinutes: number;
  overtimeMinutes: number;
  totalWorkMinutes: number;
};

type HoursTotals = {
  shiftMinutes: number;
  overtimeMinutes: number;
  totalWorkMinutes: number;
};

type RangeKey = "weeks" | "custom";

function monthStartIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function clampWeekRange(from: string, to: string) {
  const today = toIsoDate(new Date());
  return { from, to: to > today ? today : to };
}

function formatShortDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(intlLocale(), {
    ...intlDateOptions({ day: "numeric", month: "short" }),
  });
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function rowsToCsv(rows: HoursRow[], totals: HoursTotals) {
  const headers = [
    "Employee",
    "Day",
    "Shift hours",
    "Overtime hours",
    "Total work hours",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        csvCell(r.name),
        r.day,
        (r.shiftMinutes / 60).toFixed(2),
        (r.overtimeMinutes / 60).toFixed(2),
        (r.totalWorkMinutes / 60).toFixed(2),
      ].join(","),
    ),
    [
      csvCell("TOTAL"),
      "",
      (totals.shiftMinutes / 60).toFixed(2),
      (totals.overtimeMinutes / 60).toFixed(2),
      (totals.totalWorkMinutes / 60).toFixed(2),
    ].join(","),
  ];
  return lines.join("\n");
}

export default function HoursReportPage() {
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = user?.role === "tenant_admin";

  const [range, setRange] = useState<RangeKey>("weeks");
  const [monthStart, setMonthStart] = useState(() => monthStartIso());
  const [week, setWeek] = useState(() => weekOfMonth(toIsoDate(new Date())));
  const [from, setFrom] = useState(() => {
    const w = monthWeeks(monthStartIso()).find(
      (x) => x.week === weekOfMonth(toIsoDate(new Date())),
    )!;
    return clampWeekRange(w.from, w.to).from;
  });
  const [to, setTo] = useState(() => {
    const w = monthWeeks(monthStartIso()).find(
      (x) => x.week === weekOfMonth(toIsoDate(new Date())),
    )!;
    return clampWeekRange(w.from, w.to).to;
  });
  const [rows, setRows] = useState<HoursRow[] | null>(null);
  const [totals, setTotals] = useState<HoursTotals>({
    shiftMinutes: 0,
    overtimeMinutes: 0,
    totalWorkMinutes: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (fromDay: string, toDay: string) => {
    setBusy(true);
    setError(null);
    try {
      const data = await api<{
        from: string;
        to: string;
        rows: HoursRow[];
        totals: HoursTotals;
      }>(
        `/v1/attendance/hours-report?from=${encodeURIComponent(fromDay)}&to=${encodeURIComponent(toDay)}`,
      );
      setRows(data.rows ?? []);
      setTotals(
        data.totals ?? {
          shiftMinutes: 0,
          overtimeMinutes: 0,
          totalWorkMinutes: 0,
        },
      );
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : t("Failed"));
    } finally {
      setBusy(false);
    }
  }, []);

  function applyWeek(nextMonth: string, nextWeek: number) {
    const slot = monthWeeks(nextMonth).find((w) => w.week === nextWeek);
    if (!slot) return;
    const rangeDays = clampWeekRange(slot.from, slot.to);
    setMonthStart(nextMonth);
    setWeek(nextWeek);
    setFrom(rangeDays.from);
    setTo(rangeDays.to);
    void load(rangeDays.from, rangeDays.to);
  }

  function applyRange(next: RangeKey) {
    setRange(next);
    if (next === "weeks") {
      applyWeek(monthStart, week);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const empty = useMemo(() => rows !== null && rows.length === 0, [rows]);

  const uniquePeople = useMemo(() => {
    if (!rows) return 0;
    return new Set(rows.map((r) => r.employeeId)).size;
  }, [rows]);

  const avgMinutes =
    uniquePeople > 0
      ? Math.round(totals.totalWorkMinutes / uniquePeople)
      : 0;

  function exportCsv() {
    if (!rows) return;
    const blob = new Blob([rowsToCsv(rows, totals)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hours-report-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("Hours report")} />
        <p className="text-sm text-ink-muted">
          {t("Only admins can view the hours report.")}
        </p>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/app/attendance">{t("Back to attendance")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <nav className="flex flex-wrap items-center gap-1">
            <Link
              href="/app/attendance"
              className="hover:text-ink hover:underline"
            >
              {t("Attendance")}
            </Link>
            <ChevronRight className="h-3 w-3 opacity-50 rtl:rotate-180" />
            <span className="text-ink">{t("Hours report")}</span>
          </nav>
        }
        title={t("Hours report")}
        subtitle={t(
          "Shift, overtime and total hours per employee per day.",
        )}
        actions={
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Segmented
              aria-label={t("Date range")}
              value={range}
              onChange={applyRange}
              options={[
                { value: "weeks", label: t("Weeks") },
                { value: "custom", label: t("Custom") },
              ]}
            />
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!rows?.length}
              onClick={exportCsv}
            >
              <Download className="h-4 w-4" />
              {t("Export CSV")}
            </Button>
          </div>
        }
      />

      {range === "weeks" ? (
        <Card className="overflow-hidden p-3 sm:p-4">
          <HoursWeekStrip
            monthStart={monthStart}
            week={week}
            onMonthChange={(next) => applyWeek(next, week)}
            onWeekChange={(next) => applyWeek(monthStart, next)}
          />
        </Card>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-5 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void load(from, to);
          }}
        >
          <div className="space-y-1 sm:w-40">
            <Label htmlFor="hours-from">{t("From")}</Label>
            <Input
              id="hours-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1 sm:w-40">
            <Label htmlFor="hours-to">{t("To")}</Label>
            <Input
              id="hours-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
            {busy ? t("Loading…") : t("Apply")}
          </Button>
        </form>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-5">
          <StatBlock
            label={t("Shift hours")}
            value={formatMinutesAsDecimalHours(totals.shiftMinutes, 1)}
            size="sm"
          />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <StatBlock
            label={t("Overtime hours")}
            value={formatMinutesAsDecimalHours(totals.overtimeMinutes, 1)}
            size="sm"
          />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <StatBlock
            label={t("Total work hours")}
            value={formatMinutesAsDecimalHours(totals.totalWorkMinutes, 1)}
            size="sm"
          />
        </div>
        <div className="rounded-lg border border-line bg-surface p-5">
          <StatBlock
            label={t("Avg per person")}
            value={
              uniquePeople > 0
                ? `${formatMinutesAsDecimalHours(avgMinutes, 1)}h`
                : "—"
            }
            size="sm"
          />
        </div>
      </div>

      {rows === null || busy ? (
        <PageSkeleton dense />
      ) : empty ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <EmptyState
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title={t("No hours in this range.")}
            subtitle={t("Adjust the date range and apply again.")}
          />
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-line bg-surface md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-start text-sm">
                <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t("Employee")}</th>
                    <th className="px-3 py-2.5 font-medium">{t("Date")}</th>
                    <th className="px-3 py-2.5 text-end font-medium">
                      {t("Shift hours")}
                    </th>
                    <th className="px-3 py-2.5 text-end font-medium">
                      {t("Overtime")}
                    </th>
                    <th className="px-4 py-2.5 text-end font-medium">
                      {t("Total")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.employeeId}-${r.day}`}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-3">
                        <PersonCell
                          name={r.name}
                          avatar={
                            <UserAvatar
                              name={r.name}
                              avatarUrl={null}
                              size="sm"
                            />
                          }
                        />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-ink-muted">
                        {formatShortDay(r.day)}
                      </td>
                      <td className="px-3 py-3 text-end tabular-nums text-ink">
                        {formatMinutesAsDecimalHours(r.shiftMinutes)}
                      </td>
                      <td className="px-3 py-3 text-end">
                        {r.overtimeMinutes > 0 ? (
                          <Chip tone="warn" className="ms-auto">
                            {formatMinutesAsDecimalHours(r.overtimeMinutes)}
                          </Chip>
                        ) : (
                          <span className="tabular-nums text-ink-muted">
                            {formatMinutesAsDecimalHours(0)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold tabular-nums text-ink">
                        {formatMinutesAsDecimalHours(r.totalWorkMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-surface-2/80">
                    <td
                      className="px-4 py-3 text-xs text-ink-muted"
                      colSpan={2}
                    >
                      {t("Total · {n} rows", { n: rows.length })}
                    </td>
                    <td className="px-3 py-3 text-end font-semibold tabular-nums text-ink">
                      {formatMinutesAsDecimalHours(totals.shiftMinutes)}
                    </td>
                    <td className="px-3 py-3 text-end font-semibold tabular-nums text-ink">
                      {formatMinutesAsDecimalHours(totals.overtimeMinutes)}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums text-ink">
                      {formatMinutesAsDecimalHours(totals.totalWorkMinutes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={`${r.employeeId}-${r.day}`}>
                <div className="rounded-lg border border-line bg-surface p-4">
                  <PersonCell
                    name={r.name}
                    subtitle={formatShortDay(r.day)}
                    avatar={
                      <UserAvatar name={r.name} avatarUrl={null} size="sm" />
                    }
                  />
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-ink-muted">{t("Shift")}</dt>
                      <dd className="font-medium tabular-nums text-ink">
                        {formatMinutesAsDecimalHours(r.shiftMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">{t("Overtime")}</dt>
                      <dd
                        className={cn(
                          "font-medium tabular-nums",
                          r.overtimeMinutes > 0 ? "text-warn" : "text-ink",
                        )}
                      >
                        {r.overtimeMinutes > 0 ? (
                          <Chip tone="warn">
                            {formatMinutesAsDecimalHours(r.overtimeMinutes)}
                          </Chip>
                        ) : (
                          formatMinutesAsDecimalHours(0)
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-ink-muted">{t("Total")}</dt>
                      <dd className="font-semibold tabular-nums text-ink">
                        {formatMinutesAsDecimalHours(r.totalWorkMinutes)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
            <li className="px-1 pt-1 text-xs text-ink-muted">
              {t("Total · {n} rows", { n: rows.length })}
              {" · "}
              {formatMinutesAsDecimalHours(totals.totalWorkMinutes)}
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
