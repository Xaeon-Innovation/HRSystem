import type { FastifyInstance } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import {
  employeeJobRoles,
  employeeSkills,
  jobRoleSkills,
  trainingAssignments,
} from "@hr/db";
import {
  SKILL_LEVEL_RANK,
  type SkillLevel,
  type TrainingReason,
} from "@hr/shared";

const OPEN_STATUSES = ["proposed", "in_progress"] as const;

export async function ensureTrainingForGap(input: {
  app: FastifyInstance;
  tenantId: string;
  employeeId: string;
  skillId: string;
  reason: TrainingReason;
  createdByUserId?: string | null;
  note?: string | null;
}): Promise<{ id: string; created: boolean }> {
  const { app, tenantId, employeeId, skillId, reason } = input;

  const existing = await app.db.query.trainingAssignments.findFirst({
    where: and(
      eq(trainingAssignments.tenantId, tenantId),
      eq(trainingAssignments.employeeId, employeeId),
      eq(trainingAssignments.skillId, skillId),
      inArray(trainingAssignments.status, [...OPEN_STATUSES]),
    ),
    columns: { id: true },
  });
  if (existing) {
    return { id: existing.id, created: false };
  }

  const [row] = await app.db
    .insert(trainingAssignments)
    .values({
      tenantId,
      employeeId,
      skillId,
      reason,
      status: "proposed",
      note: input.note ?? null,
      createdByUserId: input.createdByUserId ?? null,
    })
    .returning({ id: trainingAssignments.id });

  return { id: row.id, created: true };
}

/** For each job-role skill required by the employee's roles, open gap training if below required. */
export async function syncTrainingGapsForEmployee(
  app: FastifyInstance,
  tenantId: string,
  employeeId: string,
  createdByUserId?: string | null,
): Promise<number> {
  const roleLinks = await app.db
    .select({ jobRoleId: employeeJobRoles.jobRoleId })
    .from(employeeJobRoles)
    .where(
      and(
        eq(employeeJobRoles.tenantId, tenantId),
        eq(employeeJobRoles.employeeId, employeeId),
      ),
    );
  if (roleLinks.length === 0) return 0;

  const roleIds = [...new Set(roleLinks.map((r) => r.jobRoleId))];
  const required = await app.db
    .select({
      skillId: jobRoleSkills.skillId,
      requiredLevel: jobRoleSkills.requiredLevel,
    })
    .from(jobRoleSkills)
    .where(
      and(
        eq(jobRoleSkills.tenantId, tenantId),
        inArray(jobRoleSkills.jobRoleId, roleIds),
      ),
    );

  // Highest required level wins when the same skill appears on multiple roles.
  const requiredBySkill = new Map<string, SkillLevel>();
  for (const row of required) {
    const level = row.requiredLevel as SkillLevel;
    const prev = requiredBySkill.get(row.skillId);
    if (!prev || SKILL_LEVEL_RANK[level] > SKILL_LEVEL_RANK[prev]) {
      requiredBySkill.set(row.skillId, level);
    }
  }
  if (requiredBySkill.size === 0) return 0;

  const skillIds = [...requiredBySkill.keys()];
  const current = await app.db
    .select({
      skillId: employeeSkills.skillId,
      level: employeeSkills.level,
    })
    .from(employeeSkills)
    .where(
      and(
        eq(employeeSkills.tenantId, tenantId),
        eq(employeeSkills.employeeId, employeeId),
        inArray(employeeSkills.skillId, skillIds),
      ),
    );
  const levelBySkill = new Map(
    current.map((r) => [r.skillId, r.level as SkillLevel]),
  );

  let opened = 0;
  for (const [skillId, requiredLevel] of requiredBySkill) {
    const have = levelBySkill.get(skillId);
    const haveRank = have ? SKILL_LEVEL_RANK[have] : 0;
    if (haveRank >= SKILL_LEVEL_RANK[requiredLevel]) continue;
    const result = await ensureTrainingForGap({
      app,
      tenantId,
      employeeId,
      skillId,
      reason: "gap",
      createdByUserId,
    });
    if (result.created) opened += 1;
  }
  return opened;
}

/** After job-role skills change, open gap training for every assignee below the new requirements. */
export async function syncTrainingGapsForJobRole(
  app: FastifyInstance,
  tenantId: string,
  jobRoleId: string,
  createdByUserId?: string | null,
): Promise<number> {
  const assignees = await app.db
    .select({ employeeId: employeeJobRoles.employeeId })
    .from(employeeJobRoles)
    .where(
      and(
        eq(employeeJobRoles.tenantId, tenantId),
        eq(employeeJobRoles.jobRoleId, jobRoleId),
      ),
    );
  let opened = 0;
  for (const { employeeId } of assignees) {
    opened += await syncTrainingGapsForEmployee(
      app,
      tenantId,
      employeeId,
      createdByUserId,
    );
  }
  return opened;
}
