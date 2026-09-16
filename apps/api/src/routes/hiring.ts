import type { FastifyPluginAsync } from "fastify";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  loadHiringSnapshot,
  saveHiringSnapshot,
} from "../services/hiring.js";
import { sendEmail } from "../services/mail.js";
import {
  requireModuleRole,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { requirePlanFeature } from "../lib/features.js";

export const hiringRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requirePlanFeature("hiring"));

  app.get(
    "/",
    { preHandler: requireModuleRole("hiring") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const hiring = await loadHiringSnapshot(app, tenantId);
      return { hiring };
    },
  );

  app.put(
    "/",
    { preHandler: requireModuleRole("hiring") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const body = (request.body ?? {}) as Record<string, unknown>;
      const snapshot =
        body.snapshot && typeof body.snapshot === "object"
          ? (body.snapshot as Record<string, unknown>)
          : body;
      if (!Array.isArray(snapshot.jobs) || !Array.isArray(snapshot.candidates)) {
        return reply
          .code(400)
          .send({ error: "snapshot must include jobs and candidates arrays" });
      }
      const expectedVersion =
        typeof body.expectedVersion === "number"
          ? body.expectedVersion
          : typeof snapshot.version === "number"
            ? snapshot.version
            : undefined;
      const hiring = await saveHiringSnapshot(
        app,
        tenantId,
        snapshot,
        expectedVersion,
      );
      if (!hiring) {
        return reply.code(409).send({
          error: "Hiring data was updated elsewhere. Reload and try again.",
        });
      }
      await writeAudit(app, {
        actor: user,
        tenantId,
        action: "hiring.snapshot_saved",
        resourceType: "hiring_state",
        resourceId: tenantId,
        metadata: {
          jobs: hiring.jobs.length,
          candidates: hiring.candidates.length,
          version: hiring.version,
        },
        request,
      });
      return { hiring };
    },
  );

  app.post(
    "/send-email",
    { preHandler: requireModuleRole("hiring") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const body = (request.body ?? {}) as Record<string, unknown>;
      const to = typeof body.to === "string" ? body.to.trim() : "";
      const subject =
        typeof body.subject === "string" ? body.subject.trim() : "";
      const text =
        typeof body.body === "string"
          ? body.body
          : typeof body.text === "string"
            ? body.text
            : "";
      const candidateId =
        typeof body.candidateId === "string" ? body.candidateId : undefined;
      if (!to || !subject) {
        return reply
          .code(400)
          .send({ error: "to and subject are required" });
      }
      const result = await sendEmail({
        to,
        subject,
        text,
        html: `<p>${text
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\n", "<br/>")}</p>`,
      });
      await writeAudit(app, {
        actor: user,
        tenantId,
        action: "hiring.email_send",
        resourceType: "hiring_communication",
        resourceId: candidateId ?? tenantId,
        metadata: {
          to,
          subject,
          ok: result.ok,
          reason: result.ok ? undefined : result.reason,
          candidateId,
        },
        request,
      });
      return { ...result, status: result.ok ? "sent" : "failed" };
    },
  );
};
