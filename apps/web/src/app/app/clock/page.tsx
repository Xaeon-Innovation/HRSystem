"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, History, LogOut, Fingerprint } from "lucide-react";
import { api, getTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  enqueueClockEvent,
  flushClockQueue,
  getPosition,
  type GeoCoords,
  type LastKnownPosition,
} from "@/lib/offline-queue";
import { useClockStatus } from "@/components/clock-status-provider";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  EmptyState,
  MiniBars,
  Notice,
  PageHeader,
  SessionBar,
  Timeline,
  type TimelineItem,
} from "@/components/elevora";

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
const RING_R = 110;
const RING_C = 2 * Math.PI * RING_R;

type ShiftToday = {
  instance: {
    id: string;
    startAt: string;
    endAt: string;
    lateClockIn: boolean;
    lateClockOut: boolean;
    overtimeStatus: string;
    dayDeduction: boolean;
  } | null;
  pendingLeftZoneIncident: { id: string; status: string } | null;
  activeBreak: {
    id: string;
    startedAt: string | null;
    durationMinutes: number;
  } | null;
  breakPolicy: {
    durationMinutes: number;
    periodMode: string;
  } | null;
  graceMinutes: number;
};

function coordsFromLastKnown(
  last: LastKnownPosition | null,
): GeoCoords | null {
  if (!last) return null;
  if (Date.now() - last.at > LAST_KNOWN_MAX_AGE_MS) return null;
  return { lat: last.lat, lng: last.lng };
}

function isGeoFailure(msg: string) {
  const lower = msg.toLowerCase();
  return (
    lower.includes("location") ||
    lower.includes("gps") ||
    lower.includes("permission")
  );
}

function formatHm(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function shiftProgress(startAt: string, endAt: string): number {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!(end > start)) return 0;
  const now = Date.now();
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export default function ClockPage() {
  const {
    clockedIn,
    setClockedIn,
    refreshStatus,
    locationError,
    lastKnownPosition,
    setLocationError,
  } = useClockStatus();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);
  const [shift, setShift] = useState<ShiftToday | null>(null);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const loadShift = useCallback(async () => {
    try {
      const data = await api<ShiftToday>("/v1/shifts/today");
      setShift(data);
    } catch {
      setShift(null);
    }
  }, []);

  async function refresh() {
    await refreshStatus();
    await loadShift();
    const remaining = await flushClockQueue(async (item) => {
      const { access } = getTokens();
      if (!access) throw new Error("Not signed in");
      await api(
        `/v1/attendance/${item.type === "clock-in" ? "clock-in" : "clock-out"}`,
        {
          method: "POST",
          body: JSON.stringify({
            lat: item.lat,
            lng: item.lng,
            clientEventId: item.clientEventId,
            clientTimestamp: item.clientTimestamp,
          }),
        },
      );
    });
    setQueued(remaining);
  }

  useEffect(() => {
    refresh().catch((e) => setMessage(e.message));
    const onOnline = () => {
      void refresh();
    };
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => void loadShift(), 30_000);
    const tick = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
      clearInterval(tick);
    };
  }, []);

  async function resolvePosition(): Promise<GeoCoords> {
    try {
      return await getPosition();
    } catch (err) {
      const cached = coordsFromLastKnown(lastKnownPosition);
      if (cached) return cached;
      throw err;
    }
  }

  const clockBlocked = Boolean(
    shift?.pendingLeftZoneIncident || shift?.instance?.dayDeduction,
  );

  async function toggle() {
    setBusy(true);
    setMessage(null);
    setLocationError(null);
    try {
      const pos = await resolvePosition();
      const type = clockedIn ? "clock-out" : "clock-in";
      if (!navigator.onLine) {
        await enqueueClockEvent({
          type,
          lat: pos.lat,
          lng: pos.lng,
          clientEventId: crypto.randomUUID(),
          clientTimestamp: new Date().toISOString(),
        });
        setMessage("Offline, event queued and will sync when online");
        setQueued((n) => n + 1);
        setClockedIn(type === "clock-in");
        setLocationError(null);
        return;
      }
      await api(`/v1/attendance/${type}`, {
        method: "POST",
        body: JSON.stringify({
          lat: pos.lat,
          lng: pos.lng,
          clientEventId: crypto.randomUUID(),
        }),
      });
      setClockedIn(type === "clock-in");
      setMessage(type === "clock-in" ? "Clocked in" : "Clocked out");
      setLocationError(null);
      await loadShift();
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      if (isGeoFailure(errMsg)) {
        setLocationError(errMsg);
      } else if (
        errMsg.toLowerCase().includes("left-zone") ||
        errMsg.toLowerCase().includes("deduction") ||
        errMsg.toLowerCase().includes("waiting for admin")
      ) {
        setMessage(errMsg);
        await loadShift();
      } else {
        try {
          const pos = await resolvePosition();
          const type = clockedIn ? "clock-out" : "clock-in";
          await enqueueClockEvent({
            type,
            lat: pos.lat,
            lng: pos.lng,
            clientEventId: crypto.randomUUID(),
            clientTimestamp: new Date().toISOString(),
          });
          setQueued((n) => n + 1);
          setMessage(`${errMsg}, queued for retry`);
        } catch (geoErr) {
          setLocationError(
            geoErr instanceof Error ? geoErr.message : errMsg,
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function respondOt(stay: boolean) {
    if (!shift?.instance) return;
    setShiftBusy(true);
    try {
      await api(`/v1/shifts/instances/${shift.instance.id}/overtime`, {
        method: "POST",
        body: JSON.stringify({ stay }),
      });
      setMessage(
        stay
          ? t("Overtime approved — stay in your work zone")
          : t("Please clock out within the grace period"),
      );
      await loadShift();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setShiftBusy(false);
    }
  }

  async function toggleBreak() {
    setShiftBusy(true);
    try {
      if (shift?.activeBreak) {
        await api("/v1/shifts/breaks/end", { method: "POST", body: "{}" });
        setMessage(t("Break ended"));
      } else {
        await api("/v1/shifts/breaks/start", { method: "POST", body: "{}" });
        setMessage(t("Break started — you may leave the work zone"));
      }
      await loadShift();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setShiftBusy(false);
    }
  }

  const showOtPrompt =
    clockedIn &&
    shift?.instance &&
    (shift.instance.overtimeStatus === "prompted" ||
      shift.instance.overtimeStatus === "none") &&
    new Date(shift.instance.endAt).getTime() <= nowTick;

  const progress = shift?.instance
    ? shiftProgress(shift.instance.startAt, shift.instance.endAt)
    : clockedIn
      ? 0.46
      : 0;
  const dashOffset = +(RING_C * (1 - progress)).toFixed(3);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const timelineItems = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = [];
    if (shift?.instance) {
      items.push({
        id: "shift",
        title: t("Scheduled shift"),
        meta: `${formatHm(shift.instance.startAt)} – ${formatHm(shift.instance.endAt)}`,
        tone: shift.instance.lateClockIn ? "warn" : "accent",
      });
      if (shift.instance.lateClockIn) {
        items.push({
          id: "late-in",
          title: t("Marked late clock-in"),
          tone: "warn",
        });
      }
      if (shift.instance.lateClockOut) {
        items.push({
          id: "late-out",
          title: t("Marked late clock-out"),
          tone: "warn",
        });
      }
    }
    if (shift?.activeBreak?.startedAt) {
      items.push({
        id: "break",
        title: t("On break"),
        meta: `${t("Started")} ${formatHm(shift.activeBreak.startedAt)}`,
        tone: "accent",
      });
    }
    if (clockedIn) {
      items.push({
        id: "clocked-in",
        title: t("On shift, clocked in"),
        meta: t("Live now"),
        tone: "accent",
      });
    } else if (shift?.instance) {
      items.push({
        id: "clocked-out",
        title: t("Off shift, clocked out"),
      });
    }
    return items;
  }, [shift, clockedIn]);

  const sessionBlocks = useMemo(() => {
    if (!shift?.instance) return [];
    const start = new Date(shift.instance.startAt).getTime();
    const end = new Date(shift.instance.endAt).getTime();
    const span = Math.max(1, end - start);
    const worked = clockedIn
      ? Math.min(span, Math.max(0, nowTick - start))
      : 0;
    return [
      {
        id: "worked",
        startPercent: 0,
        widthPercent: Math.max(2, (worked / span) * 100),
        tone: "accent" as const,
      },
      {
        id: "remain",
        startPercent: Math.max(2, (worked / span) * 100),
        widthPercent: Math.max(0, 100 - (worked / span) * 100),
        tone: "idle" as const,
      },
    ];
  }, [shift, clockedIn, nowTick]);

  const statusLabel = shift?.activeBreak
    ? t("On break")
    : clockedIn
      ? t("On shift")
      : t("Off shift");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Clock")}
        subtitle={t("One tap. The server records the time.")}
        actions={
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/attendance">
              <History className="me-1.5 h-4 w-4" />
              {t("My history")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3.5 lg:grid-cols-12">
        <section className="min-w-0 rounded-lg border border-line bg-surface p-5 sm:p-7 lg:col-span-7">
          {shift?.pendingLeftZoneIncident ? (
            <Notice tone="warn" className="mb-4">
              {t(
                "Waiting for admin on left-zone exit — clock-in is blocked until resolved",
              )}
            </Notice>
          ) : null}

          {shift?.instance?.dayDeduction ? (
            <Notice tone="warn" className="mb-4">
              {t("This work day is marked for deduction")}
            </Notice>
          ) : null}

          {locationError ? (
            <Notice tone="warn" className="mb-4">
              {locationError}
            </Notice>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-2xs text-ink-muted">
                {t("Today")} · {todayLabel}
              </p>
              <p className="mt-1 text-base font-semibold text-ink">
                {shift?.instance
                  ? `${t("Shift")} ${formatHm(shift.instance.startAt)} – ${formatHm(shift.instance.endAt)}`
                  : t("No shift scheduled")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-2xs font-medium text-ink-muted">
                {t("Mobile · clock in anywhere")}
              </span>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-2xs font-medium",
                  clockedIn
                    ? "border-accent/40 bg-accent-tint text-accent-ink"
                    : "border-line bg-surface-2 text-ink-muted",
                )}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="relative mx-auto mt-8 h-[240px] w-[240px]">
            <svg viewBox="0 0 240 240" className="absolute inset-0" aria-hidden>
              <circle
                cx="120"
                cy="120"
                r={RING_R}
                fill="none"
                stroke="hsl(var(--surface-3))"
                strokeWidth="10"
              />
              <circle
                cx="120"
                cy="120"
                r={RING_R}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING_C.toFixed(3)}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 120 120)"
              />
            </svg>
            <button
              type="button"
              disabled={busy || (!clockedIn && clockBlocked)}
              onClick={() => void toggle()}
              className={cn(
                "absolute inset-[36px] flex flex-col items-center justify-center rounded-full text-center transition-opacity disabled:opacity-50",
                clockedIn
                  ? "bg-ink text-primary-foreground"
                  : "hatch text-accent-ink",
              )}
            >
              {clockedIn ? (
                <LogOut className="mb-1 h-5 w-5 opacity-80" />
              ) : (
                <Fingerprint className="mb-1 h-5 w-5 opacity-80" />
              )}
              <span className="text-base font-semibold">
                {busy ? "…" : clockedIn ? t("Clock out") : t("Clock in")}
              </span>
              <span className="mt-0.5 text-2xs font-medium opacity-70">
                {clockedIn ? t("Tap to end") : t("Tap to start")}
              </span>
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            {shift?.breakPolicy ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={shiftBusy || !clockedIn}
                onClick={() => void toggleBreak()}
              >
                <Coffee className="me-1.5 h-4 w-4" />
                {shift.activeBreak ? t("End break") : t("Start break")}
              </Button>
            ) : null}
            {queued > 0 ? (
              <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs text-ink-muted">
                {queued} {t("events waiting to sync")}
              </span>
            ) : null}
          </div>

          {message ? (
            <p className="mt-4 text-center text-sm text-ink-muted">{message}</p>
          ) : null}

          {shift?.activeBreak ? (
            <Notice tone="accent" className="mt-4">
              {t("On break — zone exit allowed until duration ends")}
              {shift.breakPolicy
                ? ` · ${shift.breakPolicy.durationMinutes} ${t("min")} ${t("policy")}`
                : null}
            </Notice>
          ) : null}

          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <b className="text-ink">{t("Today")}</b>
              <span className="text-ink-muted">{t("Server time")}</span>
            </div>
            {timelineItems.length === 0 ? (
              <EmptyState
                className="py-6"
                title={t("No events yet")}
                subtitle={t("Clock in or wait for your shift to begin.")}
              />
            ) : (
              <Timeline items={timelineItems} />
            )}
          </div>
        </section>

        <div className="min-w-0 space-y-3.5 lg:col-span-5">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink">{t("Today")}</h3>
            <p className="text-2xs text-ink-muted">
              {t("Shift window and flags")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <TodayTile
                label={t("Clocked in")}
                value={clockedIn ? t("Yes") : t("No")}
                sub={
                  shift?.instance?.lateClockIn ? t("Late") : t("On time")
                }
                ok={!shift?.instance?.lateClockIn && clockedIn}
              />
              <TodayTile
                label={t("Expected out")}
                value={
                  shift?.instance ? formatHm(shift.instance.endAt) : "—"
                }
                sub={
                  shift?.graceMinutes
                    ? `${shift.graceMinutes} ${t("min")} ${t("grace")}`
                    : "—"
                }
              />
              <TodayTile
                label={t("Break")}
                value={
                  shift?.breakPolicy
                    ? `${shift.activeBreak ? "…" : "0"} / ${shift.breakPolicy.durationMinutes}m`
                    : "—"
                }
                sub={
                  shift?.activeBreak ? t("In progress") : t("Not started")
                }
              />
              <TodayTile
                label={t("Overtime")}
                value={
                  shift?.instance?.overtimeStatus === "approved"
                    ? t("Approved")
                    : "—"
                }
                sub={
                  shift?.instance
                    ? `${t("Prompt at")} ${formatHm(shift.instance.endAt)}`
                    : "—"
                }
              />
            </div>
            {sessionBlocks.length > 0 ? (
              <div className="mt-4">
                <SessionBar
                  blocks={sessionBlocks}
                  dayLabels={
                    shift?.instance
                      ? [
                          formatHm(shift.instance.startAt),
                          "12:00",
                          formatHm(shift.instance.endAt),
                        ]
                      : ["08:00", "12:00", "17:00"]
                  }
                />
              </div>
            ) : null}
          </section>

          {showOtPrompt ? (
            <section className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink">
                {t("Overtime prompt")}
              </h3>
              <p className="text-2xs text-ink-muted">
                {t("Shown at end of shift")}
                {shift?.graceMinutes
                  ? ` · ${shift.graceMinutes} ${t("min")} ${t("grace")}`
                  : null}
              </p>
              <Notice className="mt-3">
                <b>
                  {t("Your shift ended at")}{" "}
                  {shift?.instance ? formatHm(shift.instance.endAt) : ""}
                </b>
                <div className="text-xs text-ink-muted">
                  {t("Stay on overtime or clock out now.")}
                </div>
              </Notice>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="w-full flex-1"
                  disabled={shiftBusy || busy}
                  onClick={() => void toggle()}
                >
                  {t("Clock out")}
                </Button>
                <Button
                  className="w-full flex-1"
                  disabled={shiftBusy}
                  onClick={() => void respondOt(true)}
                >
                  {t("Stay · overtime")}
                </Button>
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">
                {t("This week")}
              </h3>
              <Link
                href="/app/attendance"
                className="text-xs font-medium text-accent-strong hover:underline"
              >
                {t("History")}
              </Link>
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <div className="text-stat font-semibold tabular text-ink">
                  {shift?.instance ? "—" : "—"}
                </div>
                <p className="text-2xs text-ink-muted">
                  {t("Weekly hours when aggregates load")}
                </p>
              </div>
              <MiniBars
                values={[0, 0, 0, 0, clockedIn ? 1 : 0]}
                height={48}
                className="w-28"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TodayTile({
  label,
  value,
  sub,
  ok,
}: {
  label: string;
  value: string;
  sub: string;
  ok?: boolean;
}) {
  return (
    <div className="rounded-[12px] bg-surface-2 p-3">
      <div className="text-2xs text-ink-muted">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular text-ink">{value}</div>
      <div
        className={cn(
          "mt-0.5 text-2xs",
          ok ? "font-medium text-accent-strong" : "text-ink-muted",
        )}
      >
        {sub}
      </div>
    </div>
  );
}
