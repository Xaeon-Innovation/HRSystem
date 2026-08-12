"use client";

import { useEffect, useRef } from "react";
import { getTokens, wsUrl } from "@/lib/api";
import { api } from "@/lib/api";
import { DEFAULT_PING_INTERVAL_SEC } from "@hr/shared";

type Options = {
  onError?: (message: string | null) => void;
  onStatusChange?: (clockedIn: boolean) => void;
};

/**
 * Streams geolocation while the employee is clocked in.
 * Mount from AppShell via ClockStatusProvider so navigation does not stop pings.
 */
export function useLocationStream(enabled: boolean, options: Options = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSentAt = useRef(0);
  const onErrorRef = useRef(options.onError);
  const onStatusChangeRef = useRef(options.onStatusChange);
  onErrorRef.current = options.onError;
  onStatusChangeRef.current = options.onStatusChange;

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    if (!navigator.geolocation) {
      onErrorRef.current?.(
        "Location is unavailable on this device. Enable GPS to share your position while clocked in.",
      );
      return;
    }

    const { access } = getTokens();
    if (!access) return;

    const ws = new WebSocket(wsUrl(access));
    wsRef.current = ws;
    const buffer: unknown[] = [];
    const minIntervalMs = DEFAULT_PING_INTERVAL_SEC * 1000;

    const flush = () => {
      while (buffer.length && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(buffer.shift()));
      }
    };

    ws.onopen = () => flush();

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
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
      else buffer.push(msg);
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        onErrorRef.current?.(null);
        sendPing(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access to appear on the live map."
            : "Could not read your location. Check GPS and try again.";
        onErrorRef.current?.(message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    // Periodic forced ping (still requires a fresh getCurrentPosition — never invent coords)
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          sendPing(pos.coords.latitude, pos.coords.longitude, true),
        () => undefined,
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 8000 },
      );
    }, minIntervalMs);

    const statusTimer = setInterval(() => {
      void api<{ clockedIn: boolean }>("/v1/attendance/status")
        .then((s) => {
          if (!s.clockedIn) {
            onStatusChangeRef.current?.(false);
            ws.close();
          }
        })
        .catch(() => undefined);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(statusTimer);
      navigator.geolocation.clearWatch(watchId);
      ws.close();
    };
  }, [enabled]);
}
