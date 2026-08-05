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
import { authRoutes } from "./routes/auth.js";
import { tenantRoutes } from "./routes/tenants.js";
import { employeeRoutes } from "./routes/employees.js";
import { attendanceRoutes } from "./routes/attendance.js";
import { liveMapRoutes } from "./routes/live-map.js";
import { kpiRoutes } from "./routes/kpis.js";
import { notificationRoutes } from "./routes/notifications.js";
import { healthRoutes } from "./routes/health.js";
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
  const app = Fastify({ logger: true });

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
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(tenantRoutes, { prefix: "/v1/tenants" });
  await app.register(employeeRoutes, { prefix: "/v1/employees" });
  await app.register(attendanceRoutes, { prefix: "/v1/attendance" });
  await app.register(liveMapRoutes, { prefix: "/v1/admin" });
  await app.register(kpiRoutes, { prefix: "/v1/kpis" });
  await app.register(notificationRoutes, { prefix: "/v1/notifications" });
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
