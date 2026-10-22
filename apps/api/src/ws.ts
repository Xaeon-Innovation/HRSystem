import type { FastifyInstance } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import { attendanceRecords } from "@hr/db";
import { locationPingSchema, type JwtPayload } from "@hr/shared";
import { tenantHasFeature } from "./lib/features.js";
import {
  broadcastLocationUpdate,
  recordClockedInLocation,
} from "./services/location.js";
import { addClient, removeClient } from "./ws-hub.js";

const AUTH_TIMEOUT_MS = 5_000;

export async function registerWs(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, _request) => {
    let user: JwtPayload | null = null;
    let authed = false;

    const authTimer = setTimeout(() => {
      if (!authed) socket.close();
    }, AUTH_TIMEOUT_MS);

    const attachAdminMapRoom = () => {
      if (user?.role === "tenant_admin" && user.tenantId) {
        addClient(`tenant:${user.tenantId}:map`, socket);
        socket.on("close", () =>
          removeClient(`tenant:${user!.tenantId}:map`, socket),
        );
      }
    };

    const handleAuthedMessage = async (raw: Buffer) => {
      if (!user) return;
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          payload?: unknown;
          token?: string;
        };
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong" }));
          return;
        }
        if (msg.type === "location.ping") {
          if (!user.employeeId || !user.tenantId) return;
          const parsed = locationPingSchema.safeParse(msg.payload);
          if (!parsed.success) {
            socket.send(
              JSON.stringify({ type: "error", error: "invalid ping" }),
            );
            return;
          }

          const open = await app.db.query.attendanceRecords.findFirst({
            where: and(
              eq(attendanceRecords.tenantId, user.tenantId),
              eq(attendanceRecords.employeeId, user.employeeId),
              isNull(attendanceRecords.clockOutAt),
            ),
          });
          if (!open) {
            socket.send(
              JSON.stringify({ type: "error", error: "not_clocked_in" }),
            );
            return;
          }

          const recordedAt = parsed.data.recordedAt
            ? new Date(parsed.data.recordedAt)
            : new Date();

          await recordClockedInLocation(app, {
            tenantId: user.tenantId,
            employeeId: user.employeeId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            recordedAt,
            clientPingId: parsed.data.clientPingId ?? null,
          });

          const { handleComplianceLocationPing } = await import(
            "./services/shifts.js"
          );
          const compliance = await handleComplianceLocationPing(app, {
            tenantId: user.tenantId,
            employeeId: user.employeeId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
          });

          if (user.role === "employee") {
            broadcastLocationUpdate(user.tenantId, {
              employeeId: user.employeeId,
              lat: parsed.data.lat,
              lng: parsed.data.lng,
              updatedAt: recordedAt.toISOString(),
              isClockedIn: !compliance.autoClockedOut,
            });
          }

          socket.send(
            JSON.stringify({
              type: "location.ack",
              autoClockedOut: compliance.autoClockedOut,
            }),
          );
        } else if (
          msg.type === "subscribe.map" &&
          user.role === "tenant_admin" &&
          user.tenantId
        ) {
          const hasFieldOps = await tenantHasFeature(
            app.db,
            user.tenantId,
            "liveMap",
          );
          if (!hasFieldOps) {
            socket.send(
              JSON.stringify({
                type: "error",
                error: "plan_missing_liveMap",
              }),
            );
            return;
          }
          addClient(`tenant:${user.tenantId}:map`, socket);
          socket.send(
            JSON.stringify({
              type: "subscribed",
              room: `tenant:${user.tenantId}:map`,
            }),
          );
        }
      } catch (err) {
        app.log.error(err);
        socket.send(JSON.stringify({ type: "error", error: "bad_message" }));
      }
    };

    socket.on("message", async (raw: Buffer) => {
      if (!authed) {
        try {
          const msg = JSON.parse(raw.toString()) as {
            type?: string;
            token?: string;
          };
          if (msg.type !== "auth" || typeof msg.token !== "string") {
            socket.close();
            return;
          }
          user = app.jwt.verify<JwtPayload>(msg.token);
          if (!user.tenantId && user.role !== "super_admin") {
            socket.close();
            return;
          }
          authed = true;
          clearTimeout(authTimer);
          attachAdminMapRoom();
          socket.send(JSON.stringify({ type: "auth.ok" }));
        } catch {
          socket.close();
        }
        return;
      }
      await handleAuthedMessage(raw);
    });

    socket.on("close", () => clearTimeout(authTimer));
  });
}
