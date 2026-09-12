import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { createDb, tenants } from "@hr/db";
import { brandingRoutes } from "./routes/branding.js";
import { uploadRoutes } from "./routes/uploads.js";
import { authRoutes } from "./routes/auth.js";
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

const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("tenant branding logos", () => {
  let app: ReturnType<typeof Fastify> | null = null;
  let client: ReturnType<typeof createDb>["client"] | null = null;
  let skip = false;
  let empToken = "";
  let adminToken = "";
  let tenantId = "";

  beforeAll(async () => {
    try {
      const created = createDb(DATABASE_URL);
      client = created.client;
      await created.db.select().from(tenants).limit(1);

      app = Fastify({ logger: false, bodyLimit: 4 * 1024 * 1024 });
      await app.register(cors, { origin: true });
      await app.register(jwt, { secret: JWT_SECRET });
      app.decorate("db", created.db);
      app.decorate("env", {
        jwtRefreshSecret:
          process.env.JWT_REFRESH_SECRET ??
          "dev-refresh-secret-change-in-production-min-32",
      } satisfies AppEnv);
      await app.register(authRoutes, { prefix: "/v1/auth" });
      await app.register(uploadRoutes, { prefix: "/v1/uploads" });
      await app.register(brandingRoutes, { prefix: "/v1/admin" });
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
      const adminLogin = await app.inject({
        method: "POST",
        url: "/v1/auth/login",
        payload: {
          email: "admin@cms.local",
          password: "Admin123!",
          tenantSlug: "cms",
        },
      });
      if (empLogin.statusCode !== 200 || adminLogin.statusCode !== 200) {
        skip = true;
        console.warn("Skipping branding logo tests — seed users missing");
        return;
      }
      const empBody = empLogin.json() as { accessToken: string };
      const adminBody = adminLogin.json() as {
        accessToken: string;
        user: { tenantId: string | null };
      };
      empToken = empBody.accessToken;
      adminToken = adminBody.accessToken;
      tenantId = adminBody.user.tenantId ?? "";
      if (!tenantId) {
        skip = true;
        console.warn("Skipping branding logo tests — tenant missing");
      }
    } catch (err) {
      skip = true;
      console.warn("Skipping branding logo tests — database unavailable", err);
    }
  });

  afterAll(async () => {
    if (app && !skip && adminToken) {
      await app.inject({
        method: "DELETE",
        url: "/v1/admin/branding/logo",
        headers: { authorization: `Bearer ${adminToken}` },
      });
    }
    if (app) await app.close();
    if (client) await client.end();
  });

  it("lets a tenant admin upload and fetch a logo", async () => {
    if (skip || !app) return;
    const uploaded = await app.inject({
      method: "POST",
      url: "/v1/admin/branding/logo",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { imageBase64: PNG_1X1 },
    });
    expect(uploaded.statusCode).toBe(200);
    const body = uploaded.json() as { branding: { logoUrl: string | null } };
    expect(body.branding.logoUrl).toContain(tenantId);

    const served = await app.inject({
      method: "GET",
      url: `/v1/uploads/logos/${tenantId}`,
    });
    expect(served.statusCode).toBe(200);
    expect(served.headers["content-type"]).toMatch(/image\/png/);
  });

  it("lets employees read branding so the logo can show in the shell", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "GET",
      url: "/v1/admin/branding",
      headers: { authorization: `Bearer ${empToken}` },
    });
    expect(res.statusCode).toBe(200);
  });

  it("rejects logo uploads from employees", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/branding/logo",
      headers: { authorization: `Bearer ${empToken}` },
      payload: { imageBase64: PNG_1X1 },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejects non-image logo payloads", async () => {
    if (skip || !app) return;
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/branding/logo",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { imageBase64: Buffer.from("hello").toString("base64") },
    });
    expect(res.statusCode).toBe(400);
  });
});
