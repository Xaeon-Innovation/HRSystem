"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  async function refresh() {
    await refreshStatus();
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
    return () => window.removeEventListener("online", onOnline);
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
        setMessage("Offline — event queued and will sync when online");
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
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed";
      if (isGeoFailure(errMsg)) {
        setLocationError(errMsg);
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
          setMessage(`${errMsg} — queued for retry`);
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
          {t("Clock")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("One tap. Server timestamps. Offline-safe.")}</p>
      </div>
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
                {t("On shift — clocked in")}</span>
            ) : (
              <span className="text-muted-foreground">{t("Off shift — clocked out")}</span>
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
            disabled={busy}
            onClick={toggle}
            variant={clockedIn ? "destructive" : "default"}
          >
            {busy ? "…" : clockedIn ? t("Out") : t("In")}
          </Button>
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
              {queued} {t("queued event(s)")}</p>
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
