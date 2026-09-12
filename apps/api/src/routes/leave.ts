import type { FastifyPluginAsync } from "fastify";
import {
  leaveAdjustBalanceSchema,
  leaveBulkDecideSchema,
  leaveCancelSchema,
  leaveCommentSchema,
  leaveDecideSchema,
  leaveHrNoteSchema,
  leaveRequestDraftSchema,
  type JwtPayload,
  type LeavePolicy,
  type LeaveRequestDraft,
  type LeaveType,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  draftForActor,
  leaveActorFor,
  loadLeaveStore,
  notifyLeaveDecision,
  notifyLeaveSubmitted,
  runLeaveAccrual,
  saveLeaveStore,
  visibleSnapshot,
} from "../services/leave.js";
import {
  requireModuleRole,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";

function asDraft(body: ReturnType<typeof leaveRequestDraftSchema.parse>): LeaveRequestDraft {
  return {
    employeeId: body.employeeId ?? "",
    leaveTypeId: body.leaveTypeId,
    startDate: body.startDate,
    endDate: body.endDate,
    requestedDays: body.requestedDays ?? null,
    partialDayType: body.partialDayType,
    customHours: body.customHours ?? null,
    urgency: body.urgency,
    reason: body.reason,
    handoverNotes: body.handoverNotes,
    coverageEmployeeId: body.coverageEmployeeId ?? null,
    attachmentName: body.attachmentName ?? null,
    attachments: body.attachments ?? [],
    asDraft: body.asDraft,
  };
}

export const leaveRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const actor = await leaveActorFor(app, user);
    const store = await loadLeaveStore(app, tenantId, actor);
    await saveLeaveStore(app, tenantId, store);
    return { leave: visibleSnapshot(store, actor) };
  });

  app.post("/requests", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = leaveRequestDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = await leaveActorFor(app, user);
    try {
      const store = await loadLeaveStore(app, tenantId, actor);
      const created = store.submit(draftForActor(actor, asDraft(parsed.data)), actor);
      await saveLeaveStore(app, tenantId, store);
      await notifyLeaveSubmitted(app, tenantId, created, actor);
      await writeAudit(app, {
        actor: user,
        action: "leave.submit",
        tenantId,
        resourceType: "leave_request",
        resourceId: created.id,
        metadata: { status: created.status, leaveTypeId: created.leaveTypeId },
        request,
      });
      return reply.code(201).send({
        request: created,
        leave: visibleSnapshot(store, actor),
      });
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Could not submit leave" });
    }
  });

  app.post("/requests/:id/resubmit", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const parsed = leaveRequestDraftSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = await leaveActorFor(app, user);
    try {
      const store = await loadLeaveStore(app, tenantId, actor);
      const existing = store.request(id);
      if (!existing) return reply.code(404).send({ error: "Request not found" });
      if (actor.role === "employee" && existing.employeeId !== actor.employeeId) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const updated = store.resubmit(id, draftForActor(actor, asDraft(parsed.data)), actor);
      await saveLeaveStore(app, tenantId, store);
      await notifyLeaveSubmitted(app, tenantId, updated, actor);
      return { request: updated, leave: visibleSnapshot(store, actor) };
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Could not update leave" });
    }
  });

  app.post("/requests/:id/decide", async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = leaveDecideSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const actor = await leaveActorFor(app, user);
      try {
        const store = await loadLeaveStore(app, tenantId, actor);
        const updated = store.decide(
          id,
          parsed.data.decision,
          actor,
          parsed.data.comment,
        );
        await saveLeaveStore(app, tenantId, store);
        await notifyLeaveDecision(app, tenantId, updated);
        await writeAudit(app, {
          actor: user,
          action: `leave.${parsed.data.decision}`,
          tenantId,
          resourceType: "leave_request",
          resourceId: id,
          metadata: { status: updated.status },
          request,
        });
        return { request: updated, leave: visibleSnapshot(store, actor) };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : "Could not update leave" });
      }
    });

  app.post(
    "/requests/bulk-decide",
    { preHandler: requireModuleRole("leaves") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const parsed = leaveBulkDecideSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const actor = await leaveActorFor(app, user);
      const store = await loadLeaveStore(app, tenantId, actor);
      const results = store.bulkDecide(
        parsed.data.ids,
        parsed.data.decision,
        actor,
        parsed.data.comment,
      );
      await saveLeaveStore(app, tenantId, store);
      for (const row of results) {
        if (!row.ok) continue;
        const req = store.request(row.id);
        if (req) await notifyLeaveDecision(app, tenantId, req);
      }
      return { results, leave: visibleSnapshot(store, actor) };
    },
  );

  app.post("/requests/:id/cancel", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const parsed = leaveCancelSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = await leaveActorFor(app, user);
    try {
      const store = await loadLeaveStore(app, tenantId, actor);
      const existing = store.request(id);
      if (!existing) return reply.code(404).send({ error: "Request not found" });
      if (actor.role === "employee" && existing.employeeId !== actor.employeeId) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const updated = store.cancel(id, actor, parsed.data.note);
      await saveLeaveStore(app, tenantId, store);
      return { request: updated, leave: visibleSnapshot(store, actor) };
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Could not cancel leave" });
    }
  });

  app.post("/requests/:id/comments", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const parsed = leaveCommentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = await leaveActorFor(app, user);
    try {
      const store = await loadLeaveStore(app, tenantId, actor);
      const existing = store.request(id);
      if (!existing) return reply.code(404).send({ error: "Request not found" });
      if (actor.role === "employee" && existing.employeeId !== actor.employeeId) {
        return reply.code(403).send({ error: "Forbidden" });
      }
      const kind =
        parsed.data.kind ?? (actor.role === "tenant_admin" ? "approver" : "employee");
      const updated = store.addComment(id, actor, kind, parsed.data.body);
      await saveLeaveStore(app, tenantId, store);
      return { request: updated, leave: visibleSnapshot(store, actor) };
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Could not comment" });
    }
  });

  app.patch(
    "/requests/:id/hr-note",
    { preHandler: requireModuleRole("leaves") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = leaveHrNoteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const actor = await leaveActorFor(app, user);
      const store = await loadLeaveStore(app, tenantId, actor);
      try {
        const updated = store.updateHrNote(id, parsed.data.note, actor);
        await saveLeaveStore(app, tenantId, store);
        return { request: updated, leave: visibleSnapshot(store, actor) };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : "Could not save note" });
      }
    },
  );

  app.post(
    "/balances/adjust",
    { preHandler: requireModuleRole("leaves") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const parsed = leaveAdjustBalanceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const actor = await leaveActorFor(app, user);
      try {
        const store = await loadLeaveStore(app, tenantId, actor);
        store.adjustBalance({ ...parsed.data, actor });
        await saveLeaveStore(app, tenantId, store);
        return { leave: visibleSnapshot(store, actor) };
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : "Could not adjust balance" });
      }
    },
  );

  app.patch(
    "/types/:id",
    { preHandler: requireModuleRole("leaves") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const actor = await leaveActorFor(app, user);
      const store = await loadLeaveStore(app, tenantId, actor);
      const updated = store.updateType(id, (request.body ?? {}) as Partial<LeaveType>);
      if (!updated) return reply.code(404).send({ error: "Not found" });
      await saveLeaveStore(app, tenantId, store);
      return { type: updated, leave: visibleSnapshot(store, actor) };
    },
  );

  app.patch(
    "/policies/:id",
    { preHandler: requireModuleRole("leaves") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const actor = await leaveActorFor(app, user);
      const store = await loadLeaveStore(app, tenantId, actor);
      const updated = store.updatePolicy(id, (request.body ?? {}) as Partial<LeavePolicy>);
      if (!updated) return reply.code(404).send({ error: "Not found" });
      await saveLeaveStore(app, tenantId, store);
      return { policy: updated, leave: visibleSnapshot(store, actor) };
    },
  );

  app.post(
    "/accrual",
    { preHandler: requireModuleRole("leaves") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const actor = await leaveActorFor(app, user);
      const posted = await runLeaveAccrual(app, tenantId);
      const store = await loadLeaveStore(app, tenantId, actor);
      return { posted, leave: visibleSnapshot(store, actor) };
    },
  );
};
