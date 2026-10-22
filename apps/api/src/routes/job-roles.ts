import type { FastifyPluginAsync } from "fastify";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  employeeJobRoles,
  jobRoleCriteria,
  jobRoles,
  jobRoleSkills,
  skills,
} from "@hr/db";
import {
  createJobRoleCriterionSchema,
  createJobRoleSchema,
  updateJobRoleCriterionSchema,
  updateJobRoleSchema,
  upsertJobRoleSkillSchema,
  type JwtPayload,
} from "@hr/shared";
import { z } from "zod";
import { writeAudit } from "../lib/audit.js";
import { requireRoles, tenantIdOf } from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";
import { syncTrainingGapsForJobRole } from "../services/training-gaps.js";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

const replaceJobRoleSkillsSchema = z.array(upsertJobRoleSkillSchema).max(200);

export const jobRoleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const rows = await app.db.query.jobRoles.findMany({
      where: eq(jobRoles.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    const counts = await app.db
      .select({
        jobRoleId: employeeJobRoles.jobRoleId,
        count: sql<number>`count(*)::int`,
      })
      .from(employeeJobRoles)
      .where(eq(employeeJobRoles.tenantId, tenantId))
      .groupBy(employeeJobRoles.jobRoleId);
    const countById = new Map(counts.map((c) => [c.jobRoleId, c.count]));
    return {
      jobRoles: rows.map((row) => ({
        ...row,
        employeeCount: countById.get(row.id) ?? 0,
      })),
    };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createJobRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const name = normalizeName(parsed.data.name);
      const clash = await app.db
        .select({ id: jobRoles.id })
        .from(jobRoles)
        .where(
          and(
            eq(jobRoles.tenantId, tenantId),
            sql`lower(${jobRoles.name}) = ${name.toLowerCase()}`,
          ),
        )
        .limit(1);
      if (clash[0]) {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
      try {
        const [row] = await app.db
          .insert(jobRoles)
          .values({
            tenantId,
            name,
            description: parsed.data.description ?? null,
            responsibilities: parsed.data.responsibilities ?? null,
            requirements: parsed.data.requirements ?? null,
          })
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "job_role.create",
          tenantId,
          resourceType: "job_role",
          resourceId: row.id,
          metadata: { name: row.name },
          request,
        });
        return reply.code(201).send({ jobRole: { ...row, employeeCount: 0 } });
      } catch {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateJobRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.jobRoles.findFirst({
        where: and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const name = parsed.data.name
        ? normalizeName(parsed.data.name)
        : existing.name;
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const clash = await app.db
          .select({ id: jobRoles.id })
          .from(jobRoles)
          .where(
            and(
              eq(jobRoles.tenantId, tenantId),
              sql`lower(${jobRoles.name}) = ${name.toLowerCase()}`,
            ),
          )
          .limit(1);
        if (clash[0] && clash[0].id !== id) {
          return reply
            .code(409)
            .send({ error: "A job role with that name already exists" });
        }
      }
      const patch: {
        name: string;
        updatedAt: Date;
        description?: string | null;
        responsibilities?: string | null;
        requirements?: string | null;
      } = { name, updatedAt: new Date() };
      if (parsed.data.description !== undefined) {
        patch.description = parsed.data.description;
      }
      if (parsed.data.responsibilities !== undefined) {
        patch.responsibilities = parsed.data.responsibilities;
      }
      if (parsed.data.requirements !== undefined) {
        patch.requirements = parsed.data.requirements;
      }
      try {
        const [updated] = await app.db
          .update(jobRoles)
          .set(patch)
          .where(and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)))
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "job_role.update",
          tenantId,
          resourceType: "job_role",
          resourceId: id,
          metadata: { name },
          request,
        });
        return { jobRole: updated };
      } catch {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.jobRoles.findFirst({
        where: and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(jobRoles)
        .where(and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)));
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "job_role.delete",
        tenantId,
        resourceType: "job_role",
        resourceId: id,
        metadata: { name: existing.name },
        request,
      });
      return { ok: true };
    },
  );

  async function loadRoleOr404(tenantId: string, id: string) {
    return app.db.query.jobRoles.findFirst({
      where: and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)),
      columns: { id: true, name: true },
    });
  }

  // --- Criteria ---

  app.get("/:id/criteria", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const role = await loadRoleOr404(tenantId, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    const criteria = await app.db.query.jobRoleCriteria.findMany({
      where: and(
        eq(jobRoleCriteria.tenantId, tenantId),
        eq(jobRoleCriteria.jobRoleId, id),
      ),
      orderBy: (t, { asc }) => [asc(t.sortOrder), asc(t.name)],
    });
    return { criteria };
  });

  app.post(
    "/:id/criteria",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const role = await loadRoleOr404(tenantId, id);
      if (!role) return reply.code(404).send({ error: "Not found" });
      const parsed = createJobRoleCriterionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [row] = await app.db
        .insert(jobRoleCriteria)
        .values({
          tenantId,
          jobRoleId: id,
          name: parsed.data.name.trim(),
          metric: parsed.data.metric ?? null,
          targetValue: parsed.data.targetValue ?? null,
          weight: parsed.data.weight ?? 1,
          sortOrder: parsed.data.sortOrder ?? 0,
        })
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "job_role_criterion.create",
        tenantId,
        resourceType: "job_role_criterion",
        resourceId: row.id,
        metadata: { jobRoleId: id, name: row.name },
        request,
      });
      return reply.code(201).send({ criterion: row });
    },
  );

  app.patch(
    "/:id/criteria/:criterionId",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id, criterionId } = request.params as {
        id: string;
        criterionId: string;
      };
      const parsed = updateJobRoleCriterionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.jobRoleCriteria.findFirst({
        where: and(
          eq(jobRoleCriteria.id, criterionId),
          eq(jobRoleCriteria.jobRoleId, id),
          eq(jobRoleCriteria.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if (parsed.data.name !== undefined) patch.name = parsed.data.name.trim();
      if (parsed.data.metric !== undefined) patch.metric = parsed.data.metric;
      if (parsed.data.targetValue !== undefined) {
        patch.targetValue = parsed.data.targetValue;
      }
      if (parsed.data.weight !== undefined) patch.weight = parsed.data.weight;
      if (parsed.data.sortOrder !== undefined) {
        patch.sortOrder = parsed.data.sortOrder;
      }
      const [updated] = await app.db
        .update(jobRoleCriteria)
        .set(patch)
        .where(
          and(
            eq(jobRoleCriteria.id, criterionId),
            eq(jobRoleCriteria.tenantId, tenantId),
          ),
        )
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "job_role_criterion.update",
        tenantId,
        resourceType: "job_role_criterion",
        resourceId: criterionId,
        metadata: { jobRoleId: id },
        request,
      });
      return { criterion: updated };
    },
  );

  app.delete(
    "/:id/criteria/:criterionId",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id, criterionId } = request.params as {
        id: string;
        criterionId: string;
      };
      const existing = await app.db.query.jobRoleCriteria.findFirst({
        where: and(
          eq(jobRoleCriteria.id, criterionId),
          eq(jobRoleCriteria.jobRoleId, id),
          eq(jobRoleCriteria.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(jobRoleCriteria)
        .where(
          and(
            eq(jobRoleCriteria.id, criterionId),
            eq(jobRoleCriteria.tenantId, tenantId),
          ),
        );
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "job_role_criterion.delete",
        tenantId,
        resourceType: "job_role_criterion",
        resourceId: criterionId,
        metadata: { jobRoleId: id, name: existing.name },
        request,
      });
      return { ok: true };
    },
  );

  // --- Role skills ---

  app.get("/:id/skills", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const role = await loadRoleOr404(tenantId, id);
    if (!role) return reply.code(404).send({ error: "Not found" });
    const rows = await app.db
      .select({
        id: jobRoleSkills.id,
        skillId: jobRoleSkills.skillId,
        requiredLevel: jobRoleSkills.requiredLevel,
        skillName: skills.name,
        createdAt: jobRoleSkills.createdAt,
      })
      .from(jobRoleSkills)
      .innerJoin(skills, eq(skills.id, jobRoleSkills.skillId))
      .where(
        and(
          eq(jobRoleSkills.tenantId, tenantId),
          eq(jobRoleSkills.jobRoleId, id),
        ),
      )
      .orderBy(skills.name);
    return { skills: rows };
  });

  app.put(
    "/:id/skills",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const role = await loadRoleOr404(tenantId, id);
      if (!role) return reply.code(404).send({ error: "Not found" });

      const body = Array.isArray(request.body)
        ? request.body
        : (request.body as { skills?: unknown })?.skills;
      const parsed = replaceJobRoleSkillsSchema.safeParse(body);
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
        .delete(jobRoleSkills)
        .where(
          and(
            eq(jobRoleSkills.tenantId, tenantId),
            eq(jobRoleSkills.jobRoleId, id),
          ),
        );

      if (parsed.data.length > 0) {
        await app.db.insert(jobRoleSkills).values(
          parsed.data.map((s) => ({
            tenantId,
            jobRoleId: id,
            skillId: s.skillId,
            requiredLevel: s.requiredLevel ?? "competent",
          })),
        );
      }

      const actor = request.user as JwtPayload;
      await syncTrainingGapsForJobRole(app, tenantId, id, actor.sub);

      await writeAudit(app, {
        actor,
        action: "job_role_skills.replace",
        tenantId,
        resourceType: "job_role",
        resourceId: id,
        metadata: { skillCount: parsed.data.length },
        request,
      });

      const rows = await app.db
        .select({
          id: jobRoleSkills.id,
          skillId: jobRoleSkills.skillId,
          requiredLevel: jobRoleSkills.requiredLevel,
          skillName: skills.name,
          createdAt: jobRoleSkills.createdAt,
        })
        .from(jobRoleSkills)
        .innerJoin(skills, eq(skills.id, jobRoleSkills.skillId))
        .where(
          and(
            eq(jobRoleSkills.tenantId, tenantId),
            eq(jobRoleSkills.jobRoleId, id),
          ),
        )
        .orderBy(skills.name);

      return { skills: rows };
    },
  );
};
