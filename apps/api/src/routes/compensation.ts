import type { FastifyPluginAsync } from "fastify";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  buildPayrollExportCsv,
  loadCompensationSnapshot,
  saveCompensationSnapshot,
} from "../services/compensation.js";
import {
  requireModuleRole,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { requirePlanFeature } from "../lib/features.js";

export const compensationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requirePlanFeature("compensation"));

  app.get(
    "/",
    { preHandler: requireModuleRole("compensation") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const compensation = await loadCompensationSnapshot(app, tenantId);
      return { compensation };
    },
  );

  app.put(
    "/",
    { preHandler: requireModuleRole("compensation") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const body = (request.body ?? {}) as Record<string, unknown>;
      const snapshot =
        body.snapshot && typeof body.snapshot === "object"
          ? (body.snapshot as Record<string, unknown>)
          : body;
      if (!Array.isArray(snapshot.records)) {
        return reply
          .code(400)
          .send({ error: "snapshot must include a records array" });
      }
      const expectedVersion =
        typeof body.expectedVersion === "number"
          ? body.expectedVersion
          : typeof snapshot.version === "number"
            ? snapshot.version
            : undefined;
      const compensation = await saveCompensationSnapshot(
        app,
        tenantId,
        snapshot,
        expectedVersion,
      );
      if (!compensation) {
        return reply.code(409).send({
          error:
            "Compensation data was updated elsewhere. Reload and try again.",
        });
      }
      await writeAudit(app, {
        actor: user,
        tenantId,
        action: "compensation.snapshot_saved",
        resourceType: "compensation_state",
        resourceId: tenantId,
        metadata: {
          records: compensation.records.length,
          requests: compensation.requests.length,
          version: compensation.version,
        },
        request,
      });
      return { compensation };
    },
  );

  app.get(
    "/payroll-export",
    { preHandler: requireModuleRole("compensation") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const q = request.query as { period?: string };
      const period =
        typeof q.period === "string" && q.period.trim()
          ? q.period.trim()
          : "";
      if (!period) {
        return reply
          .code(400)
          .send({ error: "period query param (YYYY-MM) is required" });
      }
      const result = await buildPayrollExportCsv(app, tenantId, period);
      if ("error" in result) {
        return reply.code(400).send({ error: result.error });
      }
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          `attachment; filename="${result.filename}"`,
        )
        .send(result.csv);
    },
  );
};
