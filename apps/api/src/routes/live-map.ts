import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { employeeLiveLocations, employees, users } from "@hr/db";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

export const liveMapRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requireRoles("tenant_admin"));

  app.get("/live-map", async (request) => {
    const tenantId = tenantIdOf(request);
    const q = request.query as { role?: string; status?: string; q?: string };

    const rows = await app.db
      .select({
        employeeId: employeeLiveLocations.employeeId,
        lat: employeeLiveLocations.lat,
        lng: employeeLiveLocations.lng,
        updatedAt: employeeLiveLocations.updatedAt,
        isClockedIn: employeeLiveLocations.isClockedIn,
        name: users.name,
        role: users.role,
        jobTitle: employees.jobTitle,
        status: employees.status,
      })
      .from(employeeLiveLocations)
      .innerJoin(
        employees,
        eq(employees.id, employeeLiveLocations.employeeId),
      )
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(
          eq(employeeLiveLocations.tenantId, tenantId),
          eq(employeeLiveLocations.isClockedIn, true),
          q.status
            ? eq(employees.status, q.status as "active" | "inactive")
            : undefined,
          q.role
            ? eq(users.role, q.role as "tenant_admin" | "employee")
            : undefined,
        ),
      );

    const filtered = q.q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q.q!.toLowerCase()) ||
            (r.jobTitle ?? "").toLowerCase().includes(q.q!.toLowerCase()),
        )
      : rows;

    return {
      locations: filtered.map((r) => ({
        ...r,
        secondsSinceUpdate: Math.floor(
          (Date.now() - new Date(r.updatedAt).getTime()) / 1000,
        ),
      })),
      polledAt: new Date().toISOString(),
    };
  });
};
