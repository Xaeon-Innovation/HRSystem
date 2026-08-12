import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import websocket from "@fastify/websocket";
import { and, eq } from "drizzle-orm";
import {
  createDb,
  employeeLiveLocations,
  employees,
  locationPings,
  tenants,
} from "@hr/db";
import { authRoutes } from "./routes/auth.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { liveMapRoutes } from "./routes/live-map.js";
import { registerWs } from "./ws.js";
import { addClient, broadcastToTenant } from "./ws-hub.js";
import type { AppEnv } from "./types.js";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(root, ".env") });

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";
const JWT_SECRET =
  process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-min-32-chars";

describe("live tracking", () => {
  let app: ReturnType<typeof Fastify> | null = null;
  let client: ReturnType<typeof createDb>["client"] | null = null;
  let skip = false;

  let empToken = "";
  let adminToken = "";
  let empEmployeeId = "";
  let empTenantId = "";
  let otherTenantId = "";

  beforeAll(async () => {
    try {
      const created = createDb(DATABASE_URL);
      client = created.client;
      await created.db.select().from(tenants).limit(1);

      app = Fastify({ logger: false });
      await app.register(cors, { origin: true });
      await app.register(jwt, { secret: JWT_SECRET });
      await app.register(websocket);
      app.decorate("db", created.db);
      app.decorate("env", {
        jwtRefreshSecret:
          process.env.JWT_REFRESH_SECRET ??
          "dev-refresh-secret-change-in-production-min-32",
      } satisfies AppEnv);
      await app.register(authRoutes, { prefix: "/v1/auth" });
      await app.register(attendanceRoutes, { prefix: "/v1/attendance" });
      await app.register(liveMapRoutes, { prefix: "/v1/admin" });
      await registerWs(app);
      await app.ready();

      const empLogin = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "employee@cms.local",
          password: "Employee123!",
          tenantSlug: "cms",
        },
      });
      if (empLogin.statusCode !== 200) {
        skip = true;
        console.warn("Skipping live tracking tests — seed users missing");
        return;
      }
      const empBody = empLogin.json() as {
        accessToken: string;
        user: { employeeId: string; tenantId: string };
      };
      empToken = empBody.accessToken;
      empEmployeeId = empBody.user.employeeId;
      empTenantId = empBody.user.tenantId;

      const adminLogin = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "admin@cms.local",
          password: "Admin123!",
          tenantSlug: "cms",
        },
      });
      adminToken = (adminLogin.json() as { accessToken: string }).accessToken;

      const acme = await created.db.query.tenants.findFirst({
        where: eq(tenants.slug, "acme"),
      });
      otherTenantId = acme?.id ?? "";
    } catch {
      skip = true;
      console.warn("Skipping live tracking tests — Postgres unavailable");
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (client) await client.end({ timeout: 1 });
  });

  async function ensureClockedOut() {
    if (!app || !empToken) return;
    const status = await app.inject({
      method: "GET",
      url: "/v1/attendance/status",
      headers: { authorization: `Bearer ${empToken}` },
    });
    const body = status.json() as { clockedIn: boolean };
    if (body.clockedIn) {
      await app.inject({
        method: "POST",
        url: "/v1/attendance/clock-out",
        headers: { authorization: `Bearer ${empToken}` },
        payload: { lat: 30.05, lng: 31.24 },
      });
    }
  }

  it("clock-in writes live location + ping; clock-out keeps last-seen", async () => {
    if (skip || !app) return;
    await ensureClockedOut();

    const received: string[] = [];
    const socket = { send: (d: string) => received.push(d) };
    addClient(`tenant:${empTenantId}:map`, socket);

    const clockIn = await app.inject({
      method: "POST",
      url: "/v1/attendance/clock-in",
      headers: { authorization: `Bearer ${empToken}` },
      payload: { lat: 30.01, lng: 31.21 },
    });
    expect(clockIn.statusCode).toBe(201);

    const live = await app.db.query.employeeLiveLocations.findFirst({
      where: eq(employeeLiveLocations.employeeId, empEmployeeId),
    });
    expect(live?.isClockedIn).toBe(true);
    expect(live?.lat).toBeCloseTo(30.01);

    const pingsAfterIn = await app.db.query.locationPings.findMany({
      where: and(
        eq(locationPings.tenantId, empTenantId),
        eq(locationPings.employeeId, empEmployeeId),
      ),
      limit: 20,
    });
    expect(pingsAfterIn.some((p) => Math.abs(p.lat - 30.01) < 0.0001)).toBe(
      true,
    );

    expect(
      received.some((r) => {
        const msg = JSON.parse(r) as {
          type: string;
          payload: { isClockedIn: boolean };
        };
        return msg.type === "location.update" && msg.payload.isClockedIn === true;
      }),
    ).toBe(true);

    const clockOut = await app.inject({
      method: "POST",
      url: "/v1/attendance/clock-out",
      headers: { authorization: `Bearer ${empToken}` },
      payload: { lat: 30.02, lng: 31.22 },
    });
    expect(clockOut.statusCode).toBe(200);

    const after = await app.db.query.employeeLiveLocations.findFirst({
      where: eq(employeeLiveLocations.employeeId, empEmployeeId),
    });
    expect(after?.isClockedIn).toBe(false);
    expect(after?.lat).toBeCloseTo(30.02);

    const mapAll = await app.inject({
      method: "GET",
      url: "/v1/admin/live-map?presence=all",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(mapAll.statusCode).toBe(200);
    const allLocs = (
      mapAll.json() as {
        locations: Array<{ employeeId: string; isClockedIn: boolean }>;
      }
    ).locations;
    expect(
      allLocs.some(
        (l) => l.employeeId === empEmployeeId && l.isClockedIn === false,
      ),
    ).toBe(true);

    const mapOnShift = await app.inject({
      method: "GET",
      url: "/v1/admin/live-map?presence=on_shift",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const onShift = (
      mapOnShift.json() as { locations: Array<{ employeeId: string }> }
    ).locations;
    expect(onShift.some((l) => l.employeeId === empEmployeeId)).toBe(false);

    expect(
      received.some((r) => {
        const msg = JSON.parse(r) as {
          type: string;
          payload: { isClockedIn: boolean };
        };
        return (
          msg.type === "location.update" && msg.payload.isClockedIn === false
        );
      }),
    ).toBe(true);
  });

  it("location-history returns in-range pings and enforces 24h cap", async () => {
    if (skip || !app) return;

    const now = new Date();
    const from = new Date(now.getTime() - 60 * 60 * 1000);
    await app.db.insert(locationPings).values([
      {
        tenantId: empTenantId,
        employeeId: empEmployeeId,
        lat: 30.1,
        lng: 31.1,
        recordedAt: new Date(now.getTime() - 30 * 60 * 1000),
      },
      {
        tenantId: empTenantId,
        employeeId: empEmployeeId,
        lat: 30.11,
        lng: 31.11,
        recordedAt: new Date(now.getTime() - 10 * 60 * 1000),
      },
    ]);

    const ok = await app.inject({
      method: "GET",
      url: `/v1/admin/location-history?employeeId=${empEmployeeId}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(now.toISOString())}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(ok.statusCode).toBe(200);
    const body = ok.json() as { pointCount: number; points: unknown[] };
    expect(body.pointCount).toBeGreaterThanOrEqual(2);

    const tooWide = await app.inject({
      method: "GET",
      url: `/v1/admin/location-history?employeeId=${empEmployeeId}&from=${encodeURIComponent(new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString())}&to=${encodeURIComponent(now.toISOString())}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(tooWide.statusCode).toBe(400);
  });

  it("location-sessions returns attendance windows for a day", async () => {
    if (skip || !app) return;
    await ensureClockedOut();

    const clockIn = await app.inject({
      method: "POST",
      url: "/v1/attendance/clock-in",
      headers: { authorization: `Bearer ${empToken}` },
      payload: { lat: 30.03, lng: 31.23 },
    });
    expect(clockIn.statusCode).toBe(201);
    const day = new Date().toISOString().slice(0, 10);

    const sessions = await app.inject({
      method: "GET",
      url: `/v1/admin/location-sessions?employeeId=${empEmployeeId}&date=${day}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(sessions.statusCode).toBe(200);
    const body = sessions.json() as {
      sessions: Array<{ clockInAt: string; clockOutAt: string | null }>;
    };
    expect(body.sessions.length).toBeGreaterThan(0);
    expect(body.sessions.some((s) => s.clockOutAt === null)).toBe(true);

    await ensureClockedOut();
  });

  it("does not leak another tenant's pings in history", async () => {
    if (skip || !app || !otherTenantId) return;

    const otherEmp = await app.db.query.employees.findFirst({
      where: eq(employees.tenantId, otherTenantId),
    });
    if (!otherEmp) return;

    const now = new Date();
    await app.db.insert(locationPings).values({
      tenantId: otherTenantId,
      employeeId: otherEmp.id,
      lat: 29.9,
      lng: 31.9,
      recordedAt: now,
    });

    const leaked = await app.inject({
      method: "GET",
      url: `/v1/admin/location-history?employeeId=${otherEmp.id}&from=${encodeURIComponent(new Date(now.getTime() - 3600000).toISOString())}&to=${encodeURIComponent(now.toISOString())}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    // CMS admin must not see Acme employee (404 not found in tenant)
    expect(leaked.statusCode).toBe(404);
  });

  it("hub still isolates tenants", () => {
    const receivedA: string[] = [];
    const receivedB: string[] = [];
    addClient("tenant:live-a:map", {
      send: (d: string) => receivedA.push(d),
    });
    addClient("tenant:live-b:map", {
      send: (d: string) => receivedB.push(d),
    });
    broadcastToTenant("live-a", { type: "location.update", payload: { x: 1 } });
    expect(receivedA).toHaveLength(1);
    expect(receivedB).toHaveLength(0);
  });
});
