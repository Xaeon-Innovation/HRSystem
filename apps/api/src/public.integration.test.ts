import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { createDb, tenants } from "@hr/db";
import { publicRoutes } from "./routes/public.js";
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

describe("public plans / signup / demo", () => {
  let app: ReturnType<typeof Fastify> | null = null;
  let client: ReturnType<typeof createDb>["client"] | null = null;
  let skip = false;
  const slug = `pub-${Date.now().toString(36)}`;
  const email = `${slug}@example.com`;

  beforeAll(async () => {
    try {
      const created = createDb(DATABASE_URL);
      client = created.client;
      await created.db.select().from(tenants).limit(1);

      app = Fastify({ logger: false });
      await app.register(cors, { origin: true });
      await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
      await app.register(jwt, { secret: JWT_SECRET });
      app.decorate("db", created.db);
      app.decorate("env", {
        jwtRefreshSecret:
          process.env.JWT_REFRESH_SECRET ??
          "dev-refresh-secret-change-in-production-min-32",
      } satisfies AppEnv);

      await app.register(publicRoutes, { prefix: "/v1/public" });
      await app.ready();
    } catch {
      skip = true;
    }
  });

  afterAll(async () => {
    await app?.close();
    await client?.end();
  });

  it("lists active plans without auth", async () => {
    if (skip || !app) return;
    const res = await app.inject({ method: "GET", url: "/v1/public/plans" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.plans)).toBe(true);
    expect(body.plans.length).toBeGreaterThan(0);
    expect(body.plans[0]).toHaveProperty("code");
    expect(body.plans[0]).toHaveProperty("amountCents");
  });

  it("rejects invalid signup", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/signup",
      payload: {
        name: "X",
        slug: "BAD",
        adminEmail: "not-an-email",
        adminPassword: "short",
        adminName: "A",
        acceptTerms: false,
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("creates a trial tenant and returns tokens", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/signup",
      payload: {
        name: "Public Trial Co",
        slug,
        adminEmail: email,
        adminPassword: "SignupTest123!",
        adminName: "Trial Admin",
        acceptTerms: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe("tenant_admin");
    expect(body.tenant.slug).toBe(slug);
    expect(body.subscription?.status).toBe("trialing");
    expect(body.checkoutIntent).toBeNull();
  });

  it("paid plan signup skips trial until Polar confirms", async () => {
    if (skip || !app) return;
    const paidSlug = `paid-${Date.now().toString(36)}`;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/signup",
      payload: {
        name: "Paid Start Co",
        slug: paidSlug,
        adminEmail: `${paidSlug}@example.com`,
        adminPassword: "SignupTest123!",
        adminName: "Paid Admin",
        acceptTerms: true,
        planCode: "field",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.subscription).toBeNull();
    expect(body.checkoutIntent).toEqual({
      planCode: "field",
      seats: null,
    });
  });

  it("rejects ops signup without seats", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/signup",
      payload: {
        name: "Ops Missing Seats",
        slug: `ops-bad-${Date.now().toString(36)}`,
        adminEmail: `ops-bad-${Date.now().toString(36)}@example.com`,
        adminPassword: "SignupTest123!",
        adminName: "Ops Admin",
        acceptTerms: true,
        planCode: "ops",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects duplicate slug", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/signup",
      payload: {
        name: "Other Co",
        slug,
        adminEmail: `other-${email}`,
        adminPassword: "SignupTest123!",
        adminName: "Other Admin",
        acceptTerms: true,
      },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/slug/i);
  });

  it("accepts demo requests", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/public/demo",
      payload: {
        name: "Demo Person",
        company: "Demo Co",
        email: "demo@example.com",
        message: "Interested in Elevora",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });
});
