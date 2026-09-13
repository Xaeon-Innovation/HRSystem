import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { createDb, tenants } from "@hr/db";
import { authRoutes } from "./routes/auth.js";
import { employeeRoutes } from "./routes/employees.js";
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

describe("employee login credentials", () => {
  let app: ReturnType<typeof Fastify> | null = null;
  let client: ReturnType<typeof createDb>["client"] | null = null;
  let skip = false;
  let empToken = "";
  let adminToken = "";
  let createdId = "";
  let createdEmail = "";

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
      await app.register(employeeRoutes, { prefix: "/v1/employees" });
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
        console.warn("Skipping employee credential tests — seed users missing");
        return;
      }
      empToken = (empLogin.json() as { accessToken: string }).accessToken;
      adminToken = (adminLogin.json() as { accessToken: string }).accessToken;
    } catch {
      skip = true;
      console.warn("Skipping employee credential tests — Postgres unavailable");
    }
  });

  afterAll(async () => {
    await app?.close();
    await client?.end();
  });

  it("lets a tenant admin view and change an employee sign-in password", async () => {
    if (skip || !app) return;
    createdEmail = `creds-${Date.now()}@cms.local`;
    const create = await app.inject({
      method: "POST",
      url: "/v1/employees",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Credentials Probe",
        email: createdEmail,
        role: "employee",
        phone: "+201099900011",
        jobTitle: "Tester",
        nationalId: `creds-${Date.now()}`,
        dateOfBirth: "1991-02-02",
        address: "Cairo",
        hireDate: "2024-02-01",
      },
    });
    expect(create.statusCode).toBe(201);
    const created = create.json() as {
      employee: { id: string; email: string };
      temporaryPassword?: string;
    };
    createdId = created.employee.id;
    expect(created.temporaryPassword).toMatch(/^Temp.+/);

    const asEmployee = await app.inject({
      method: "GET",
      url: `/v1/employees/${createdId}/credentials`,
      headers: { authorization: `Bearer ${empToken}` },
    });
    expect(asEmployee.statusCode).toBe(403);

    const creds = await app.inject({
      method: "GET",
      url: `/v1/employees/${createdId}/credentials`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(creds.statusCode).toBe(200);
    expect(creds.json()).toEqual({
      email: createdEmail,
      password: created.temporaryPassword,
    });

    const list = await app.inject({
      method: "GET",
      url: "/v1/employees",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(list.statusCode).toBe(200);
    const row = (
      list.json() as { employees: Array<Record<string, unknown>> }
    ).employees.find((e) => e.id === createdId);
    expect(row).toBeTruthy();
    expect(row).not.toHaveProperty("password");
    expect(row).not.toHaveProperty("loginPasswordCipher");
    expect(row).not.toHaveProperty("passwordHash");

    const nextPassword = "NewPass123!";
    const change = await app.inject({
      method: "POST",
      url: `/v1/employees/${createdId}/password`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { password: nextPassword },
    });
    expect(change.statusCode).toBe(200);
    expect(change.json()).toEqual({
      email: createdEmail,
      password: nextPassword,
    });

    const employeeChange = await app.inject({
      method: "POST",
      url: `/v1/employees/${createdId}/password`,
      headers: { authorization: `Bearer ${empToken}` },
      payload: { password: "Hacker123!" },
    });
    expect(employeeChange.statusCode).toBe(403);

    const loginNew = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: createdEmail,
        password: nextPassword,
        tenantSlug: "cms",
      },
    });
    expect(loginNew.statusCode).toBe(200);

    const loginOld = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: createdEmail,
        password: created.temporaryPassword,
        tenantSlug: "cms",
      },
    });
    expect(loginOld.statusCode).toBe(401);
  });
});
