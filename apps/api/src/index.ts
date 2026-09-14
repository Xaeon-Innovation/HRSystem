import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
config({ path: path.join(root, ".env") });

import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { createDb } from "@hr/db";
import { publicRoutes } from "./routes/public.js";
import { authRoutes } from "./routes/auth.js";
import { uploadRoutes } from "./routes/uploads.js";
import { tenantRoutes } from "./routes/tenants.js";
import { employeeRoutes } from "./routes/employees.js";
import { jobRoleRoutes } from "./routes/job-roles.js";
import { branchRoutes, siteRoutes } from "./routes/branches.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { liveMapRoutes } from "./routes/live-map.js";
import { placesRoutes } from "./routes/places.js";
import { brandingRoutes } from "./routes/branding.js";
import { teamTodayRoutes } from "./routes/team-today.js";
import { kpiRoutes } from "./routes/kpis.js";
import { notificationRoutes } from "./routes/notifications.js";
import { leaveRoutes } from "./routes/leave.js";
import { hiringRoutes } from "./routes/hiring.js";
import { compensationRoutes } from "./routes/compensation.js";
import { healthRoutes } from "./routes/health.js";
import { planRoutes } from "./routes/plans.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";
import { billingRoutes } from "./routes/billing.js";
import { auditRoutes } from "./routes/audits.js";
import { paymobWebhookRoutes } from "./routes/webhooks-paymob.js";
import { integrationWebhookRoutes } from "./routes/webhooks-integrations.js";
import { integrationRoutes } from "./routes/integrations.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { registerWs } from "./ws.js";
import { startJobs } from "./jobs.js";
import type { AppEnv } from "./types.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";
const JWT_SECRET =
  process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production-min-32-chars";
const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? "0.0.0.0";
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

async function main() {
  const { db, client } = createDb(DATABASE_URL);
  const app = Fastify({ logger: true, bodyLimit: 4 * 1024 * 1024 });

  await app.register(cors, {
    origin: CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });
  await app.register(jwt, { secret: JWT_SECRET });
  await app.register(websocket);

  app.decorate("db", db);
  app.decorate("env", {
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET ??
      "dev-refresh-secret-change-in-production-min-32",
  } satisfies AppEnv);

  await app.register(healthRoutes);
  await app.register(publicRoutes, { prefix: "/v1/public" });
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(uploadRoutes, { prefix: "/v1/uploads" });
  await app.register(tenantRoutes, { prefix: "/v1/tenants" });
  await app.register(planRoutes, { prefix: "/v1/plans" });
  await app.register(subscriptionRoutes, { prefix: "/v1/subscriptions" });
  await app.register(billingRoutes, { prefix: "/v1/billing" });
  await app.register(auditRoutes, { prefix: "/v1/audits" });
  await app.register(paymobWebhookRoutes, { prefix: "/v1/webhooks/paymob" });
  await app.register(integrationWebhookRoutes, {
    prefix: "/v1/webhooks/integrations",
  });
  await app.register(integrationRoutes, { prefix: "/v1/integrations" });
  await app.register(analyticsRoutes, { prefix: "/v1/analytics" });
  await app.register(employeeRoutes, { prefix: "/v1/employees" });
  await app.register(jobRoleRoutes, { prefix: "/v1/job-roles" });
  await app.register(branchRoutes, { prefix: "/v1/branches" });
  await app.register(siteRoutes, { prefix: "/v1/sites" });
  await app.register(attendanceRoutes, { prefix: "/v1/attendance" });
  await app.register(liveMapRoutes, { prefix: "/v1/admin" });
  await app.register(placesRoutes, { prefix: "/v1/admin" });
  await app.register(brandingRoutes, { prefix: "/v1/admin" });
  await app.register(teamTodayRoutes, { prefix: "/v1/admin" });
  await app.register(kpiRoutes, { prefix: "/v1/kpis" });
  await app.register(notificationRoutes, { prefix: "/v1/notifications" });
  await app.register(leaveRoutes, { prefix: "/v1/leave" });
  await app.register(hiringRoutes, { prefix: "/v1/hiring" });
  await app.register(compensationRoutes, { prefix: "/v1/compensation" });
  await registerWs(app);

  startJobs(app);

  const shutdown = async () => {
    await app.close();
    await client.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: PORT, host: HOST });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
