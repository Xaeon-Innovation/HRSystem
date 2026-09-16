"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, getTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  enqueueClockEvent,
  flushClockQueue,
  getPosition,
  type GeoCoords,
  type LastKnownPosition,
} from "@/lib/offline-queue";
import { useClockStatus } from "@/components/clock-status-provider";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import { t } from "@/i18n";

const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;

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

export default function ClockPage() {
  const redesign = useUiRedesign();
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
      await api(`/v1/attendance/${item.type === "clock-in" ? "clock-in" : "clock-out"}`, {
        method: "POST",
        body: JSON.stringify({
          lat: item.lat,
          lng: item.lng,
          clientEventId: item.clientEventId,
          clientTimestamp: item.clientTimestamp,
        }),
      });
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
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
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
    new Date(shift.instance.endAt).getTime() <= Date.now();

  return (
    <div
      className={
        redesign
          ? "mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-6 px-1"
          : "mx-auto flex max-w-md flex-col gap-6"
      }
    >
      <div className="text-center">
        <h1
          className={
            redesign
              ? "text-3xl font-semibold tracking-tight"
              : "text-2xl font-semibold"
          }
        >
          {t("Clock")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("One tap. Server timestamps. Offline-safe.")}
        </p>
      </div>

      {shift?.instance ? (
        <Card>
          <CardContent className="space-y-2 py-4 text-sm">
            <p className="font-medium">
              {t("Today’s shift")}: {formatHm(shift.instance.startAt)} –{" "}
              {formatHm(shift.instance.endAt)}
            </p>
            {shift.instance.lateClockIn ? (
              <p className="text-amber-700 dark:text-amber-400">
                {t("Marked late clock-in")}
              </p>
            ) : null}
            {shift.instance.lateClockOut ? (
              <p className="text-amber-700 dark:text-amber-400">
                {t("Marked late clock-out")}
              </p>
            ) : null}
            {shift.activeBreak ? (
              <p className="text-emerald-700 dark:text-emerald-400">
                {t("On break — zone exit allowed until duration ends")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {shift?.pendingLeftZoneIncident ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-900 dark:text-amber-200">
          {t(
            "Waiting for admin on left-zone exit — clock-in is blocked until resolved",
          )}
        </p>
      ) : null}

      {shift?.instance?.dayDeduction ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
          {t("This work day is marked for deduction")}
        </p>
      ) : null}

      {showOtPrompt ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {t("Are you staying overtime?")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              disabled={shiftBusy}
              onClick={() => void respondOt(true)}
            >
              {t("Yes")}
            </Button>
            <Button
              className="w-full sm:w-auto"
              variant="outline"
              disabled={shiftBusy}
              onClick={() => void respondOt(false)}
            >
              {t("No")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden">
        <CardHeader
          className={
            redesign
              ? "bg-secondary/60 py-6"
              : "bg-gradient-to-br from-primary/10 to-accent/40"
          }
        >
          <CardTitle className="text-center text-base font-medium">
            {clockedIn ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                {t("On shift, clocked in")}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {t("Off shift, clocked out")}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5 py-10">
          <Button
            size="lg"
            className={
              redesign
                ? "h-32 w-32 rounded-full text-xl font-semibold shadow-sm"
                : "h-28 w-28 rounded-full text-lg"
            }
            disabled={busy || (!clockedIn && clockBlocked)}
            onClick={toggle}
            variant={clockedIn ? "destructive" : "default"}
          >
            {busy ? "…" : clockedIn ? t("Out") : t("In")}
          </Button>
          {clockedIn && shift?.breakPolicy ? (
            <Button
              variant="outline"
              className="w-full max-w-xs"
              disabled={shiftBusy}
              onClick={() => void toggleBreak()}
            >
              {shift.activeBreak ? t("End break") : t("Start break")}
            </Button>
          ) : null}
          {message ? (
            <p className="max-w-xs text-center text-sm text-muted-foreground">
              {message}
            </p>
          ) : null}
          {locationError ? (
            <p className="max-w-xs text-center text-sm text-destructive">
              {locationError}
            </p>
          ) : null}
          {queued > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {queued} {t("queued event(s)")}
            </p>
          ) : null}
          {redesign ? (
            <Button asChild variant="outline" className="mt-2 w-full max-w-xs">
              <Link href="/app/attendance">{t("Attendance history")}</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
