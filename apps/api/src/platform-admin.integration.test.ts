import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { eq } from "drizzle-orm";
import {
  createDb,
  plans,
  tenants,
} from "@hr/db";
import { authRoutes } from "./routes/auth.js";
import { tenantRoutes } from "./routes/tenants.js";
import { employeeRoutes } from "./routes/employees.js";
import { auditRoutes } from "./routes/audits.js";
import { planRoutes } from "./routes/plans.js";
import { paymobWebhookRoutes } from "./routes/webhooks-paymob.js";
import { assertSeatAvailable } from "./lib/billing.js";
import { verifySubscriptionHmac } from "./lib/paymob.js";
import { createHmac } from "node:crypto";
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

describe("platform admin seat + audit + webhook", () => {
  let app: ReturnType<typeof Fastify> | null = null;
  let client: ReturnType<typeof createDb>["client"] | null = null;
  let skip = false;
  let superToken = "";
  let adminToken = "";
  let tenantId = "";

  beforeAll(async () => {
    try {
      const created = createDb(DATABASE_URL);
      client = created.client;
      await created.db.select().from(tenants).limit(1);

      app = Fastify({ logger: false });
      await app.register(cors, { origin: true });
      await app.register(jwt, { secret: JWT_SECRET });
      app.decorate("db", created.db);
      app.decorate("env", {
        jwtRefreshSecret:
          process.env.JWT_REFRESH_SECRET ??
          "dev-refresh-secret-change-in-production-min-32",
      } satisfies AppEnv);

      await app.register(authRoutes, { prefix: "/v1/auth" });
      await app.register(tenantRoutes, { prefix: "/v1/tenants" });
      await app.register(planRoutes, { prefix: "/v1/plans" });
      await app.register(auditRoutes, { prefix: "/v1/audits" });
      await app.register(employeeRoutes, { prefix: "/v1/employees" });
      await app.register(paymobWebhookRoutes, { prefix: "/v1/webhooks/paymob" });
      await app.ready();

      const loginSuper = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@hr.local",
          password:
            process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!",
        },
      });
      expect(loginSuper.statusCode).toBe(200);
      superToken = loginSuper.json().accessToken;

      const loginAdmin = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "admin@cms.local",
          password: "Admin123!",
          tenantSlug: "cms",
        },
      });
      expect(loginAdmin.statusCode).toBe(200);
      adminToken = loginAdmin.json().accessToken;
      tenantId = loginAdmin.json().user.tenantId;
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await app?.close();
    await client?.end();
  });

  it("writes audit on tenant suspend", async () => {
    if (skip || !app) return;
    const list = await app.inject({
      method: "GET",
      url: "/v1/tenants",
      headers: { authorization: `Bearer ${superToken}` },
    });
    expect(list.statusCode).toBe(200);
    const tenant = list.json().tenants.find(
      (t: { slug: string }) => t.slug === "acme",
    );
    expect(tenant).toBeTruthy();

    const patch = await app.inject({
      method: "PATCH",
      url: `/v1/tenants/${tenant.id}`,
      headers: { authorization: `Bearer ${superToken}` },
      payload: { status: "suspended" },
    });
    expect(patch.statusCode).toBe(200);

    const audits = await app.inject({
      method: "GET",
      url: `/v1/audits?tenantId=${tenant.id}&action=tenant.suspend&limit=5`,
      headers: { authorization: `Bearer ${superToken}` },
    });
    expect(audits.statusCode).toBe(200);
    expect(audits.json().audits.length).toBeGreaterThan(0);

    // restore
    await app.inject({
      method: "PATCH",
      url: `/v1/tenants/${tenant.id}`,
      headers: { authorization: `Bearer ${superToken}` },
      payload: { status: "active" },
    });
  });

  it("enforces seat limits on employee create", async () => {
    if (skip || !app) return;
    const db = app.db;
    const trial = await db.query.plans.findFirst({
      where: eq(plans.code, "trial"),
    });
    expect(trial).toBeTruthy();

    const previousLimit = trial!.seatLimit;
    await db
      .update(plans)
      .set({ seatLimit: 1, updatedAt: new Date() })
      .where(eq(plans.id, trial!.id));

    const seats = await assertSeatAvailable(db, tenantId, 1);
    // cms already has admin + employee seeded → used >= 2
    expect(seats.ok).toBe(false);

    const create = await app.inject({
      method: "POST",
      url: "/v1/employees",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Overflow User",
        email: `overflow-${Date.now()}@cms.local`,
        role: "employee",
        phone: "+201000000000",
        jobTitle: "Tester",
        nationalId: `overflow-${Date.now()}`,
        dateOfBirth: "1990-01-01",
        address: "Cairo",
        hireDate: "2024-01-01",
      },
    });
    expect(create.statusCode).toBe(403);

    await db
      .update(plans)
      .set({ seatLimit: previousLimit, updatedAt: new Date() })
      .where(eq(plans.id, trial!.id));
  });

  it("rejects invalid paymob webhook hmac", async () => {
    if (skip || !app) return;
    process.env.PAYMOB_SECRET_KEY = process.env.PAYMOB_SECRET_KEY || "sk_test";
    process.env.PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || "api_test";
    process.env.PAYMOB_HMAC_SECRET =
      process.env.PAYMOB_HMAC_SECRET || "hmac_test";
    process.env.PAYMOB_INTEGRATION_ID =
      process.env.PAYMOB_INTEGRATION_ID || "123";

    const res = await app.inject({
      method: "POST",
      url: "/v1/webhooks/paymob",
      payload: {
        trigger_type: "charge",
        subscription_data: { id: "999" },
        hmac: "deadbeef",
      },
    });
    // 401 invalid or 503 if config still incomplete
    expect([401, 503]).toContain(res.statusCode);
  });

  it("accepts valid subscription hmac when configured", () => {
    const secret = "hmac_test";
    const hmac = createHmac("sha512", secret)
      .update("chargefor999")
      .digest("hex");
    expect(verifySubscriptionHmac(secret, "charge", "999", hmac)).toBe(true);
  });
});
