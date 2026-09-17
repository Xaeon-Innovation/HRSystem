"use client";

import { useEffect, useRef } from "react";
import { getTokens, wsUrl, wsSendAuth } from "@/lib/api";
import { api } from "@/lib/api";
import { DEFAULT_PING_INTERVAL_SEC } from "@hr/shared";
import {
  messageForGeoError,
  type LastKnownPosition,
} from "@/lib/offline-queue";

type Options = {
  pingIntervalSec?: number;
  onError?: (message: string | null) => void;
  onFix?: (position: LastKnownPosition) => void;
  onStatusChange?: (clockedIn: boolean) => void;
};

const HIGH_ACCURACY_WATCH: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 5000,
  timeout: 15000,
};

const LOW_ACCURACY_WATCH: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 30000,
  timeout: 30000,
};

/**
 * Streams geolocation while the employee is clocked in.
 * Mount from AppShell via ClockStatusProvider so navigation does not stop pings.
 */
export function useLocationStream(enabled: boolean, options: Options = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSentAt = useRef(0);
  const onErrorRef = useRef(options.onError);
  const onFixRef = useRef(options.onFix);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onErrorRef.current = options.onError;
  onFixRef.current = options.onFix;
  onStatusChangeRef.current = options.onStatusChange;

  const intervalSec = options.pingIntervalSec ?? DEFAULT_PING_INTERVAL_SEC;

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    if (!navigator.geolocation) {
      onErrorRef.current?.(
        "Location is unavailable on this device. Enable Location Services for this browser.",
      );
      return;
    }

    const { access } = getTokens();
    if (!access) return;

    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;
    const buffer: unknown[] = [];
    let ready = false;
    const minIntervalMs = Math.max(intervalSec, 15) * 1000;

    const flush = () => {
      while (buffer.length && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(buffer.shift()));
      }
    };

    ws.onopen = () => {
      wsSendAuth(ws, access);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as {
          type?: string;
          autoClockedOut?: boolean;
        };
        if (msg.type === "auth.ok") {
          ready = true;
          flush();
          return;
        }
        if (msg.type === "location.ack" && msg.autoClockedOut) {
          onStatusChangeRef.current?.(false);
        }
      } catch {
        /* ignore */
      }
    };

    const sendPing = (lat: number, lng: number, force = false) => {
      const now = Date.now();
      if (!force && now - lastSentAt.current < minIntervalMs) return;
      lastSentAt.current = now;
      const msg = {
        type: "location.ping",
        payload: {
          lat,
          lng,
          recordedAt: new Date().toISOString(),
          clientPingId: crypto.randomUUID(),
        },
      };
      if (ready && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      else buffer.push(msg);
    };

    const applyFix = (pos: GeolocationPosition, forcePing = false) => {
      onErrorRef.current?.(null);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      onFixRef.current?.({ lat, lng, at: Date.now() });
      sendPing(lat, lng, forcePing);
    };

    let watchId: number | null = null;
    let fellBackToLowAccuracy = false;

    const startWatch = (watchOptions: PositionOptions) => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => applyFix(pos),
        (err) => {
          if (!fellBackToLowAccuracy && err.code !== err.PERMISSION_DENIED) {
            fellBackToLowAccuracy = true;
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            startWatch(LOW_ACCURACY_WATCH);
            return;
          }
          onErrorRef.current?.(messageForGeoError(err, "map"));
        },
        watchOptions,
      );
    };

    startWatch(HIGH_ACCURACY_WATCH);

    const pingOnce = (
      pingOptions: PositionOptions,
      onFail?: () => void,
    ) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => applyFix(pos, true),
        () => onFail?.(),
        pingOptions,
      );
    };

    // Periodic forced ping (still requires a real position, never invent coords)
    const interval = setInterval(() => {
      pingOnce(
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
        () =>
          pingOnce({
            enableHighAccuracy: false,
            maximumAge: 60000,
            timeout: 20000,
          }),
      );
    }, minIntervalMs);

    const statusTimer = setInterval(() => {
      void api<{
        clockedIn: boolean;
        liveTracking?: boolean;
        complianceTracking?: boolean;
      }>("/v1/attendance/status")
        .then((s) => {
          const tracking =
            s.liveTracking === true || s.complianceTracking === true;
          if (!s.clockedIn || !tracking) {
            onStatusChangeRef.current?.(false);
            ws.close();
          }
        })
        .catch(() => undefined);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(statusTimer);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      ws.close();
    };
  }, [enabled, intervalSec]);
}
