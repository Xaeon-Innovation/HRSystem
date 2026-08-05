"use client";

import { useEffect, useRef } from "react";
import { getTokens, wsUrl } from "@/lib/api";
import { api } from "@/lib/api";
import { DEFAULT_PING_INTERVAL_SEC } from "@hr/shared";

/**
 * Streams geolocation while the employee is clocked in.
 * Mount from the clock page layout effect via this hook.
 */
export function useLocationStream(enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      wsRef.current?.close();
      wsRef.current = null;
      return;
    }

    const { access } = getTokens();
    if (!access) return;

    const ws = new WebSocket(wsUrl(access));
    wsRef.current = ws;
    const buffer: unknown[] = [];

    const flush = () => {
      while (buffer.length && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(buffer.shift()));
      }
    };

    ws.onopen = () => flush();

    const sendPing = (lat: number, lng: number) => {
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

    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => sendPing(pos.coords.latitude, pos.coords.longitude),
        () => sendPing(30.0444, 31.2357),
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }

    const interval = setInterval(() => {
      if (!navigator.geolocation) sendPing(30.0444 + Math.random() * 0.01, 31.2357);
    }, DEFAULT_PING_INTERVAL_SEC * 1000);

    // Also confirm status periodically in case of clock-out elsewhere
    const statusTimer = setInterval(() => {
      void api<{ clockedIn: boolean }>("/v1/attendance/status")
        .then((s) => {
          if (!s.clockedIn) {
            ws.close();
          }
        })
        .catch(() => undefined);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(statusTimer);
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      ws.close();
    };
  }, [enabled]);
}
