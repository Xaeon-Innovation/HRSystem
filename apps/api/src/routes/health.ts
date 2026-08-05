import type { FastifyPluginAsync } from "fastify";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import {
  attendanceRecords,
  employeeLiveLocations,
  healthMetrics,
  kpiDefinitions,
  notifications,
} from "@hr/db";
import { authenticate, requireRoles, tenantIdOf } from "../types.js";
import type { JwtPayload } from "@hr/shared";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => ({ ok: true, service: "hr-api" }));

  app.get(
    "/v1/admin/health-metrics",
    {
      preHandler: [
        authenticate,
        async (request, reply) => {
          const user = request.user as JwtPayload;
          if (user.role === "super_admin") return;
          if (user.role !== "tenant_admin" || !user.tenantId) {
            return reply.code(403).send({ error: "Forbidden" });
          }
        },
      ],
    },
    async (request) => {
      const user = request.user as JwtPayload;
      const where =
        user.role === "super_admin"
          ? undefined
          : eq(healthMetrics.tenantId, user.tenantId!);

      const recent = await app.db.query.healthMetrics.findMany({
        where,
        orderBy: [desc(healthMetrics.createdAt)],
        limit: 50,
      });

      const aggregatesMap = new Map<string, number>();
      for (const row of recent) {
        aggregatesMap.set(
          row.metric,
          (aggregatesMap.get(row.metric) ?? 0) + row.value,
        );
      }

      return {
        aggregates: [...aggregatesMap.entries()].map(([metric, total]) => ({
          metric,
          total,
        })),
        recent,
      };
    },
  );

  app.get(
    "/v1/admin/dashboard",
    {
      preHandler: [authenticate, requireRoles("tenant_admin")],
    },
    async (request) => {
      const tenantId = tenantIdOf(request);

      const [open] = await app.db
        .select({ value: count() })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.tenantId, tenantId),
            isNull(attendanceRecords.clockOutAt),
          ),
        );

      const [live] = await app.db
        .select({ value: count() })
        .from(employeeLiveLocations)
        .where(
          and(
            eq(employeeLiveLocations.tenantId, tenantId),
            eq(employeeLiveLocations.isClockedIn, true),
          ),
        );

      const [kpis] = await app.db
        .select({ value: count() })
        .from(kpiDefinitions)
        .where(eq(kpiDefinitions.tenantId, tenantId));

      const [unread] = await app.db
        .select({ value: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.tenantId, tenantId),
            eq(notifications.read, false),
          ),
        );

      return {
        clockedIn: Number(open?.value ?? 0),
        liveLocations: Number(live?.value ?? 0),
        kpis: Number(kpis?.value ?? 0),
        unreadNotifications: Number(unread?.value ?? 0),
      };
    },
  );
};
