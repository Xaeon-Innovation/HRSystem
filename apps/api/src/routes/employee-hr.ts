import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  employeeDocuments,
  employees,
  employeeSkills,
  performanceReports,
  roleAssessments,
  skills,
  trainingAssignments,
} from "@hr/db";
import {
  createEmployeeDocumentSchema,
  createRoleAssessmentSchema,
  createSkillSchema,
  createTrainingAssignmentSchema,
  updateEmployeeDocumentSchema,
  updatePerformanceReportFeedbackSchema,
  updateSkillSchema,
  updateTrainingAssignmentSchema,
  upsertEmployeeSkillSchema,
  type JwtPayload,
} from "@hr/shared";
import { z } from "zod";
import { writeAudit } from "../lib/audit.js";
import { requireActiveSubscription } from "../lib/features.js";
import { requireRoles, tenantIdOf } from "../types.js";
import {
  ensureTrainingForGap,
  syncTrainingGapsForEmployee,
} from "../services/training-gaps.js";

const replaceEmployeeSkillsSchema = z.array(upsertEmployeeSkillSchema).max(200);

function isTenantAdmin(user: JwtPayload) {
  return (
    user.role === "tenant_admin" ||
    (user.role === "super_admin" && Boolean(user.tenantId))
  );
}

/** Admins may query any employee; employees only their own. */
function resolveEmployeeScope(
  user: JwtPayload,
  requestedEmployeeId: string | undefined,
): { employeeId?: string; forbidden?: boolean } {
  if (isTenantAdmin(user)) {
    return { employeeId: requestedEmployeeId };
  }
  if (!user.employeeId) {
    return { forbidden: true };
  }
  if (requestedEmployeeId && requestedEmployeeId !== user.employeeId) {
    return { forbidden: true };
  }
  return { employeeId: user.employeeId };
}

export const employeeHrRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  async function assertEmployeeInTenant(tenantId: string, employeeId: string) {
    return app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, employeeId),
        eq(employees.tenantId, tenantId),
      ),
      columns: { id: true, userId: true },
    });
  }

  // --- Documents ---

  app.get("/employees/:employeeId/documents", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { employeeId } = request.params as { employeeId: string };
    const scope = resolveEmployeeScope(user, employeeId);
    if (scope.forbidden || scope.employeeId !== employeeId) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const emp = await assertEmployeeInTenant(tenantId, employeeId);
    if (!emp) return reply.code(404).send({ error: "Employee not found" });
    const documents = await app.db.query.employeeDocuments.findMany({
      where: and(
        eq(employeeDocuments.tenantId, tenantId),
        eq(employeeDocuments.employeeId, employeeId),
      ),
      orderBy: (t, { asc }) => [asc(t.expiresOn)],
    });
    return { documents };
  });

  app.post(
    "/employees/:employeeId/documents",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { employeeId } = request.params as { employeeId: string };
      const emp = await assertEmployeeInTenant(tenantId, employeeId);
      if (!emp) return reply.code(404).send({ error: "Employee not found" });
      const parsed = createEmployeeDocumentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [row] = await app.db
        .insert(employeeDocuments)
        .values({
          tenantId,
          employeeId,
          type: parsed.data.type,
          label: parsed.data.label ?? null,
          documentNumber: parsed.data.documentNumber ?? null,
          expiresOn: parsed.data.expiresOn,
        })
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "employee_document.create",
        tenantId,
        resourceType: "employee_document",
        resourceId: row.id,
        metadata: { employeeId, type: row.type },
        request,
      });
      return reply.code(201).send({ document: row });
    },
  );

  app.patch(
    "/documents/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateEmployeeDocumentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.employeeDocuments.findFirst({
        where: and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (parsed.data.type !== undefined) patch.type = parsed.data.type;
      if (parsed.data.label !== undefined) patch.label = parsed.data.label;
      if (parsed.data.documentNumber !== undefined) {
        patch.documentNumber = parsed.data.documentNumber;
      }
      if (parsed.data.expiresOn !== undefined) {
        patch.expiresOn = parsed.data.expiresOn;
      }
      const [updated] = await app.db
        .update(employeeDocuments)
        .set(patch)
        .where(
          and(
            eq(employeeDocuments.id, id),
            eq(employeeDocuments.tenantId, tenantId),
          ),
        )
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "employee_document.update",
        tenantId,
        resourceType: "employee_document",
        resourceId: id,
        request,
      });
      return { document: updated };
    },
  );

  app.delete(
    "/documents/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.employeeDocuments.findFirst({
        where: and(
          eq(employeeDocuments.id, id),
          eq(employeeDocuments.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(employeeDocuments)
        .where(
          and(
            eq(employeeDocuments.id, id),
            eq(employeeDocuments.tenantId, tenantId),
          ),
        );
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "employee_document.delete",
        tenantId,
        resourceType: "employee_document",
        resourceId: id,
        metadata: { employeeId: existing.employeeId, type: existing.type },
        request,
      });
      return { ok: true };
    },
  );

  // --- Skills catalog ---

  app.get("/skills", async (request) => {
    const tenantId = tenantIdOf(request);
    const rows = await app.db.query.skills.findMany({
      where: eq(skills.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return { skills: rows };
  });

  app.post(
    "/skills",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const name = parsed.data.name.trim().replace(/\s+/g, " ");
      try {
        const [row] = await app.db
          .insert(skills)
          .values({ tenantId, name })
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "skill.create",
          tenantId,
          resourceType: "skill",
          resourceId: row.id,
          metadata: { name: row.name },
          request,
        });
        return reply.code(201).send({ skill: row });
      } catch {
        return reply.code(409).send({ error: "A skill with that name already exists" });
      }
    },
  );

  app.patch(
    "/skills/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateSkillSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.skills.findFirst({
        where: and(eq(skills.id, id), eq(skills.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const name = parsed.data.name
        ? parsed.data.name.trim().replace(/\s+/g, " ")
        : existing.name;
      try {
        const [updated] = await app.db
          .update(skills)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(skills.id, id), eq(skills.tenantId, tenantId)))
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "skill.update",
          tenantId,
          resourceType: "skill",
          resourceId: id,
          metadata: { name },
          request,
        });
        return { skill: updated };
      } catch {
        return reply.code(409).send({ error: "A skill with that name already exists" });
      }
    },
  );

  app.delete(
    "/skills/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.skills.findFirst({
        where: and(eq(skills.id, id), eq(skills.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(skills)
        .where(and(eq(skills.id, id), eq(skills.tenantId, tenantId)));
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "skill.delete",
        tenantId,
        resourceType: "skill",
        resourceId: id,
        metadata: { name: existing.name },
        request,
      });
      return { ok: true };
    },
  );

  // --- Employee skills ---

  app.get("/employees/:employeeId/skills", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { employeeId } = request.params as { employeeId: string };
    const scope = resolveEmployeeScope(user, employeeId);
    if (scope.forbidden || scope.employeeId !== employeeId) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const emp = await assertEmployeeInTenant(tenantId, employeeId);
    if (!emp) return reply.code(404).send({ error: "Employee not found" });
    const rows = await app.db
      .select({
        id: employeeSkills.id,
        skillId: employeeSkills.skillId,
        level: employeeSkills.level,
        note: employeeSkills.note,
        skillName: skills.name,
        updatedAt: employeeSkills.updatedAt,
        createdAt: employeeSkills.createdAt,
      })
      .from(employeeSkills)
      .innerJoin(skills, eq(skills.id, employeeSkills.skillId))
      .where(
        and(
          eq(employeeSkills.tenantId, tenantId),
          eq(employeeSkills.employeeId, employeeId),
        ),
      )
      .orderBy(skills.name);
    return { skills: rows };
  });

  app.put(
    "/employees/:employeeId/skills",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { employeeId } = request.params as { employeeId: string };
      const emp = await assertEmployeeInTenant(tenantId, employeeId);
      if (!emp) return reply.code(404).send({ error: "Employee not found" });

      const body = Array.isArray(request.body)
        ? request.body
        : (request.body as { skills?: unknown })?.skills;
      const parsed = replaceEmployeeSkillsSchema.safeParse(body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const skillIds = [...new Set(parsed.data.map((s) => s.skillId))];
      if (skillIds.length !== parsed.data.length) {
        return reply.code(400).send({ error: "Duplicate skillId in list" });
      }
      if (skillIds.length > 0) {
        const found = await app.db
          .select({ id: skills.id })
          .from(skills)
          .where(and(eq(skills.tenantId, tenantId), inArray(skills.id, skillIds)));
        if (found.length !== skillIds.length) {
          return reply.code(400).send({ error: "One or more skills were not found" });
        }
      }

      await app.db
        .delete(employeeSkills)
        .where(
          and(
            eq(employeeSkills.tenantId, tenantId),
            eq(employeeSkills.employeeId, employeeId),
          ),
        );

      if (parsed.data.length > 0) {
        await app.db.insert(employeeSkills).values(
          parsed.data.map((s) => ({
            tenantId,
            employeeId,
            skillId: s.skillId,
            level: s.level,
            note: s.note ?? null,
          })),
        );
      }

      const actor = request.user as JwtPayload;

      // Open strengthen training when flagged; then sync role gaps.
      for (const item of parsed.data) {
        if (item.needsStrengthening) {
          await ensureTrainingForGap({
            app,
            tenantId,
            employeeId,
            skillId: item.skillId,
            reason: "strengthen",
            createdByUserId: actor.sub,
            note: item.note ?? null,
          });
        }
      }
      await syncTrainingGapsForEmployee(app, tenantId, employeeId, actor.sub);

      await writeAudit(app, {
        actor,
        action: "employee_skills.replace",
        tenantId,
        resourceType: "employee",
        resourceId: employeeId,
        metadata: { skillCount: parsed.data.length },
        request,
      });

      const rows = await app.db
        .select({
          id: employeeSkills.id,
          skillId: employeeSkills.skillId,
          level: employeeSkills.level,
          note: employeeSkills.note,
          skillName: skills.name,
          updatedAt: employeeSkills.updatedAt,
          createdAt: employeeSkills.createdAt,
        })
        .from(employeeSkills)
        .innerJoin(skills, eq(skills.id, employeeSkills.skillId))
        .where(
          and(
            eq(employeeSkills.tenantId, tenantId),
            eq(employeeSkills.employeeId, employeeId),
          ),
        )
        .orderBy(skills.name);

      return { skills: rows };
    },
  );

  // --- Training ---

  app.get("/training", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };
    const scope = resolveEmployeeScope(user, q.employeeId);
    if (scope.forbidden) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const rows = await app.db
      .select({
        id: trainingAssignments.id,
        employeeId: trainingAssignments.employeeId,
        skillId: trainingAssignments.skillId,
        skillName: skills.name,
        reason: trainingAssignments.reason,
        status: trainingAssignments.status,
        note: trainingAssignments.note,
        createdByUserId: trainingAssignments.createdByUserId,
        completedAt: trainingAssignments.completedAt,
        createdAt: trainingAssignments.createdAt,
        updatedAt: trainingAssignments.updatedAt,
      })
      .from(trainingAssignments)
      .innerJoin(skills, eq(skills.id, trainingAssignments.skillId))
      .where(
        and(
          eq(trainingAssignments.tenantId, tenantId),
          scope.employeeId
            ? eq(trainingAssignments.employeeId, scope.employeeId)
            : undefined,
        ),
      )
      .orderBy(desc(trainingAssignments.createdAt));
    return { training: rows };
  });

  app.post(
    "/training",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createTrainingAssignmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const emp = await assertEmployeeInTenant(tenantId, parsed.data.employeeId);
      if (!emp) return reply.code(404).send({ error: "Employee not found" });
      const skill = await app.db.query.skills.findFirst({
        where: and(
          eq(skills.id, parsed.data.skillId),
          eq(skills.tenantId, tenantId),
        ),
        columns: { id: true },
      });
      if (!skill) return reply.code(400).send({ error: "Skill not found" });

      const actor = request.user as JwtPayload;
      const ensured = await ensureTrainingForGap({
        app,
        tenantId,
        employeeId: parsed.data.employeeId,
        skillId: parsed.data.skillId,
        reason: parsed.data.reason ?? "strengthen",
        createdByUserId: actor.sub,
        note: parsed.data.note ?? null,
      });

      const row = await app.db.query.trainingAssignments.findFirst({
        where: and(
          eq(trainingAssignments.id, ensured.id),
          eq(trainingAssignments.tenantId, tenantId),
        ),
      });

      if (ensured.created) {
        await writeAudit(app, {
          actor,
          action: "training.create",
          tenantId,
          resourceType: "training_assignment",
          resourceId: ensured.id,
          metadata: {
            employeeId: parsed.data.employeeId,
            skillId: parsed.data.skillId,
          },
          request,
        });
        return reply.code(201).send({ training: row });
      }
      return { training: row, existing: true };
    },
  );

  app.patch(
    "/training/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateTrainingAssignmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.trainingAssignments.findFirst({
        where: and(
          eq(trainingAssignments.id, id),
          eq(trainingAssignments.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });

      const patch: {
        updatedAt: Date;
        status?: (typeof existing)["status"];
        note?: string | null;
        reason?: (typeof existing)["reason"];
        completedAt?: Date | null;
      } = { updatedAt: new Date() };
      if (parsed.data.status !== undefined) {
        patch.status = parsed.data.status;
        if (parsed.data.status === "completed") {
          patch.completedAt = new Date();
        } else if (existing.status === "completed") {
          patch.completedAt = null;
        }
      }
      if (parsed.data.note !== undefined) patch.note = parsed.data.note;
      if (parsed.data.reason !== undefined) patch.reason = parsed.data.reason;

      const [updated] = await app.db
        .update(trainingAssignments)
        .set(patch)
        .where(
          and(
            eq(trainingAssignments.id, id),
            eq(trainingAssignments.tenantId, tenantId),
          ),
        )
        .returning();

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "training.update",
        tenantId,
        resourceType: "training_assignment",
        resourceId: id,
        metadata: { status: updated.status },
        request,
      });
      return { training: updated };
    },
  );

  // --- Role assessments ---

  app.get("/assessments", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };
    const scope = resolveEmployeeScope(user, q.employeeId);
    if (scope.forbidden) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const rows = await app.db.query.roleAssessments.findMany({
      where: and(
        eq(roleAssessments.tenantId, tenantId),
        scope.employeeId
          ? eq(roleAssessments.employeeId, scope.employeeId)
          : undefined,
      ),
      orderBy: (t, { desc: d }) => [d(t.periodEnd), d(t.createdAt)],
    });
    return { assessments: rows };
  });

  app.post(
    "/assessments",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createRoleAssessmentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const emp = await assertEmployeeInTenant(tenantId, parsed.data.employeeId);
      if (!emp) return reply.code(404).send({ error: "Employee not found" });

      const actor = request.user as JwtPayload;
      const [row] = await app.db
        .insert(roleAssessments)
        .values({
          tenantId,
          employeeId: parsed.data.employeeId,
          jobRoleId: parsed.data.jobRoleId,
          period: parsed.data.period,
          periodStart: parsed.data.periodStart,
          periodEnd: parsed.data.periodEnd,
          scores: parsed.data.scores,
          overallComment: parsed.data.overallComment ?? null,
          reviewerUserId: actor.sub,
        })
        .returning();

      await writeAudit(app, {
        actor,
        action: "role_assessment.create",
        tenantId,
        resourceType: "role_assessment",
        resourceId: row.id,
        metadata: {
          employeeId: row.employeeId,
          jobRoleId: row.jobRoleId,
          period: row.period,
        },
        request,
      });
      return reply.code(201).send({ assessment: row });
    },
  );

  // --- Performance reports ---

  app.get("/performance-reports", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string; cadence?: string };
    const scope = resolveEmployeeScope(user, q.employeeId);
    if (scope.forbidden) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const cadence =
      q.cadence === "daily" || q.cadence === "weekly" || q.cadence === "monthly"
        ? q.cadence
        : undefined;
    const rows = await app.db.query.performanceReports.findMany({
      where: and(
        eq(performanceReports.tenantId, tenantId),
        scope.employeeId
          ? eq(performanceReports.employeeId, scope.employeeId)
          : undefined,
        cadence ? eq(performanceReports.cadence, cadence) : undefined,
      ),
      orderBy: (t, { desc: d }) => [d(t.periodEnd), d(t.generatedAt)],
    });
    return { reports: rows };
  });

  app.patch(
    "/performance-reports/:id/feedback",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updatePerformanceReportFeedbackSchema.safeParse(
        request.body,
      );
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.performanceReports.findFirst({
        where: and(
          eq(performanceReports.id, id),
          eq(performanceReports.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });

      const actor = request.user as JwtPayload;
      const [updated] = await app.db
        .update(performanceReports)
        .set({
          feedback: parsed.data.feedback,
          feedbackAuthorUserId:
            parsed.data.feedback == null ? null : actor.sub,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(performanceReports.id, id),
            eq(performanceReports.tenantId, tenantId),
          ),
        )
        .returning();

      await writeAudit(app, {
        actor,
        action: "performance_report.feedback",
        tenantId,
        resourceType: "performance_report",
        resourceId: id,
        request,
      });
      return { report: updated };
    },
  );
};
