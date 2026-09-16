import type { FastifyPluginAsync } from "fastify";
import type { ZodError } from "zod";
import {
  createShiftPatternSchema,
  overtimeRespondSchema,
  resolveLeftZoneIncidentSchema,
  shiftInstanceListQuerySchema,
  updateShiftPatternSchema,
  upsertBreakPolicySchema,
  type JwtPayload,
} from "@hr/shared";
import { eq } from "drizzle-orm";
import { tenants } from "@hr/db";
import {
  requireRoles,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import {
  cancelShiftInstance,
  createShiftPattern,
  endBreak,
  getTodayShiftForEmployee,
  listBreakPolicies,
  listLeftZoneIncidents,
  listShiftInstances,
  listShiftPatterns,
  resolveLeftZoneIncident,
  respondOvertime,
  startBreak,
  updateShiftPattern,
  upsertBreakPolicy,
} from "../services/shifts.js";

function zodErrorMessage(error: ZodError): string {
  const flat = error.flatten();
  const messages = [
    ...flat.formErrors,
    ...Object.values(flat.fieldErrors).flatMap((v) => v ?? []),
  ].filter((m): m is string => Boolean(m));
  return messages[0] ?? "Invalid request";
}

function httpError(
  err: unknown,
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
) {
  const status =
    typeof err === "object" &&
    err &&
    "statusCode" in err &&
    typeof (err as { statusCode: unknown }).statusCode === "number"
      ? (err as { statusCode: number }).statusCode
      : 500;
  const message = err instanceof Error ? err.message : "Unexpected error";
  return reply.code(status).send({ error: message });
}

export const shiftRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/today", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }
    return getTodayShiftForEmployee(app, tenantId, user.employeeId);
  });

  app.get(
    "/patterns",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      return { patterns: await listShiftPatterns(app, tenantId) };
    },
  );

  app.post(
    "/patterns",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const parsed = createShiftPatternSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        const pattern = await createShiftPattern(
          app,
          tenantId,
          actor,
          parsed.data,
        );
        return reply.code(201).send({ pattern });
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.patch(
    "/patterns/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateShiftPatternSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        return {
          pattern: await updateShiftPattern(app, tenantId, id, parsed.data),
        };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.get(
    "/instances",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = shiftInstanceListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      return { instances: await listShiftInstances(app, tenantId, parsed.data) };
    },
  );

  app.post(
    "/instances/:id/cancel",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      try {
        return { instance: await cancelShiftInstance(app, tenantId, id) };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.post("/instances/:id/overtime", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }
    const parsed = overtimeRespondSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
    }
    try {
      return {
        instance: await respondOvertime(
          app,
          tenantId,
          user.employeeId,
          id,
          parsed.data.stay,
        ),
      };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.get(
    "/break-policies",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      return { policies: await listBreakPolicies(app, tenantId) };
    },
  );

  app.put(
    "/break-policies",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = upsertBreakPolicySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        return {
          policy: await upsertBreakPolicy(app, tenantId, parsed.data),
        };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.post("/breaks/start", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }
    try {
      return {
        break: await startBreak(app, tenantId, user.employeeId),
      };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.post("/breaks/end", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }
    try {
      return { break: await endBreak(app, tenantId, user.employeeId) };
    } catch (err) {
      return httpError(err, reply);
    }
  });

  app.get(
    "/left-zone-incidents",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const q = request.query as { status?: string };
      const status =
        q.status === "pending" ||
        q.status === "approved_emergency" ||
        q.status === "day_deduction"
          ? q.status
          : undefined;
      return {
        incidents: await listLeftZoneIncidents(app, tenantId, status),
      };
    },
  );

  app.post(
    "/left-zone-incidents/:id/resolve",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const actor = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = resolveLeftZoneIncidentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: zodErrorMessage(parsed.error) });
      }
      try {
        return {
          incident: await resolveLeftZoneIncident(
            app,
            tenantId,
            id,
            actor,
            parsed.data.resolution,
            parsed.data.note,
          ),
        };
      } catch (err) {
        return httpError(err, reply);
      }
    },
  );

  app.get(
    "/settings/left-zone",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
        columns: { settings: true },
      });
      return {
        leftZoneAutoClockOut: tenant?.settings.leftZoneAutoClockOut !== false,
        leftZoneResolution:
          tenant?.settings.leftZoneResolution ?? "require_admin",
      };
    },
  );

  app.patch(
    "/settings/left-zone",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const body = request.body as {
        leftZoneAutoClockOut?: boolean;
        leftZoneResolution?: string;
      };
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) return reply.code(404).send({ error: "Tenant not found" });
      const settings = {
        ...tenant.settings,
        ...(typeof body.leftZoneAutoClockOut === "boolean"
          ? { leftZoneAutoClockOut: body.leftZoneAutoClockOut }
          : {}),
        ...(body.leftZoneResolution
          ? {
              leftZoneResolution: body.leftZoneResolution as
                | "require_admin"
                | "auto_approve_emergency"
                | "auto_day_deduction",
            }
          : {}),
      };
      const [row] = await app.db
        .update(tenants)
        .set({ settings, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId))
        .returning({ settings: tenants.settings });
      return {
        leftZoneAutoClockOut: row.settings.leftZoneAutoClockOut !== false,
        leftZoneResolution:
          row.settings.leftZoneResolution ?? "require_admin",
      };
    },
  );
};
