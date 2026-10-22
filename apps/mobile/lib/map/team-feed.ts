import { Platform } from "react-native";
import { getApiUrl } from "../config";
import {
  fetchRealtimeToken,
  fetchTeamPresence,
  type TeamMember,
} from "./api";

export type TeamFeedStatus = "idle" | "live" | "polling" | "offline";

type Listener = (members: TeamMember[], status: TeamFeedStatus) => void;

function wsUrl(token: string): string | null {
  // Direct API host — Metro does not upgrade WebSockets for /ws.
  const base =
    Platform.OS === "web"
      ? process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
        "http://127.0.0.1:4000"
      : getApiUrl() || "http://127.0.0.1:4000";
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = "/ws";
    u.search = "";
    u.hash = "";
    // Token is sent after connect per server protocol.
    void token;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Live team locations: prefer WebSocket (`subscribe.map`), fall back to
 * polling `/team/presence` every 30s.
 */
export function subscribeTeamFeed(listener: Listener): () => void {
  let stopped = false;
  let ws: WebSocket | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let status: TeamFeedStatus = "idle";

  const emit = (members: TeamMember[], next: TeamFeedStatus) => {
    status = next;
    listener(members, next);
  };

  const poll = async () => {
    try {
      const data = await fetchTeamPresence();
      if (!stopped) emit(data.members, ws ? "live" : "polling");
    } catch {
      if (!stopped) emit([], "offline");
    }
  };

  const startPoll = () => {
    if (pollTimer) return;
    void poll();
    pollTimer = setInterval(() => void poll(), 30_000);
  };

  const startWs = async () => {
    try {
      const { token } = await fetchRealtimeToken();
      const url = wsUrl(token);
      if (!url || typeof WebSocket === "undefined") {
        startPoll();
        return;
      }
      ws = new WebSocket(url);
      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "auth", token }));
        ws?.send(JSON.stringify({ type: "subscribe.map" }));
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            payload?: {
              employeeId?: string;
              lat?: number;
              lng?: number;
              updatedAt?: string;
              isClockedIn?: boolean;
            };
          };
          if (msg.type === "subscribed" || msg.type === "location.update") {
            status = "live";
            // Refresh full roster so names stay correct.
            void poll();
          }
          if (msg.type === "error") {
            startPoll();
          }
        } catch {
          /* ignore */
        }
      };
      ws.onerror = () => {
        ws = null;
        startPoll();
      };
      ws.onclose = () => {
        ws = null;
        if (!stopped) startPoll();
      };
      // Always poll as safety net even when WS is up.
      startPoll();
    } catch {
      startPoll();
    }
  };

  void startWs();

  return () => {
    stopped = true;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
    void status;
  };
}
