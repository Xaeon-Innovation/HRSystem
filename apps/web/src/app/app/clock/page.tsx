"use client";

import { useEffect, useState } from "react";
import { api, getTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  enqueueClockEvent,
  flushClockQueue,
  getPosition,
} from "@/lib/offline-queue";
import { useLocationStream } from "@/hooks/use-location-stream";

export default function ClockPage() {
  const [clockedIn, setClockedIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(0);
  useLocationStream(clockedIn);

  async function refresh() {
    const status = await api<{ clockedIn: boolean }>("/v1/attendance/status");
    setClockedIn(status.clockedIn);
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

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      const pos = await getPosition();
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
    } catch (err) {
      // Queue on network failure
      try {
        const pos = await getPosition().catch(() => ({ lat: 0, lng: 0 }));
        const type = clockedIn ? "clock-out" : "clock-in";
        await enqueueClockEvent({
          type,
          lat: pos.lat,
          lng: pos.lng,
          clientEventId: crypto.randomUUID(),
          clientTimestamp: new Date().toISOString(),
        });
        setQueued((n) => n + 1);
        setMessage(
          err instanceof Error
            ? `${err.message} — queued for retry`
            : "Queued for retry",
        );
      } catch {
        setMessage(err instanceof Error ? err.message : "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Clock</h1>
        <p className="text-sm text-muted-foreground">
          One tap. Server timestamps. Offline-safe.
        </p>
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/40">
          <CardTitle className="text-center text-base">
            Status: {clockedIn ? "Clocked in" : "Clocked out"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Button
            size="lg"
            className="h-28 w-28 rounded-full text-lg"
            disabled={busy}
            onClick={toggle}
            variant={clockedIn ? "destructive" : "default"}
          >
            {busy ? "…" : clockedIn ? "Out" : "In"}
          </Button>
          {message ? (
            <p className="text-center text-sm text-muted-foreground">{message}</p>
          ) : null}
          {queued > 0 ? (
            <p className="text-xs text-amber-700">{queued} queued event(s)</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
