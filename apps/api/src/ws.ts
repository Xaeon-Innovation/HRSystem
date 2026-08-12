import type { FastifyInstance } from "fastify";
import { and, eq, isNull } from "drizzle-orm";
import {
  attendanceRecords,
  employeeLiveLocations,
  locationPings,
} from "@hr/db";
import { locationPingSchema, type JwtPayload } from "@hr/shared";
import { addClient, broadcastToTenant, removeClient } from "./ws-hub.js";

export async function registerWs(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, request) => {
    const url = new URL(request.url, "http://localhost");
    const token = url.searchParams.get("token");
    if (!token) {
      socket.close();
      return;
    }

    let user: JwtPayload;
    try {
      user = app.jwt.verify<JwtPayload>(token);
    } catch {
      socket.close();
      return;
    }

    const tenantId = user.tenantId;
    if (!tenantId && user.role !== "super_admin") {
      socket.close();
      return;
    }

    if (user.role === "tenant_admin" && tenantId) {
      addClient(`tenant:${tenantId}:map`, socket);
      socket.on("close", () => removeClient(`tenant:${tenantId}:map`, socket));
    }

    socket.on("message", async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          type: string;
          payload?: unknown;
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

          await app.db.insert(locationPings).values({
            tenantId: user.tenantId,
            employeeId: user.employeeId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            recordedAt,
            clientPingId: parsed.data.clientPingId ?? null,
          });

          await app.db
            .insert(employeeLiveLocations)
            .values({
              employeeId: user.employeeId,
              tenantId: user.tenantId,
              lat: parsed.data.lat,
              lng: parsed.data.lng,
              updatedAt: recordedAt,
              isClockedIn: true,
            })
            .onConflictDoUpdate({
              target: employeeLiveLocations.employeeId,
              set: {
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                updatedAt: recordedAt,
                isClockedIn: true,
                tenantId: user.tenantId,
              },
            });

          if (user.role === "employee") {
            broadcastToTenant(user.tenantId, {
              type: "location.update",
              payload: {
                employeeId: user.employeeId,
                lat: parsed.data.lat,
                lng: parsed.data.lng,
                updatedAt: recordedAt.toISOString(),
                isClockedIn: true,
              },
            });
          }

          socket.send(JSON.stringify({ type: "location.ack" }));
        }

        if (
          msg.type === "subscribe.map" &&
          user.role === "tenant_admin" &&
          user.tenantId
        ) {
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
    });
  });
}
