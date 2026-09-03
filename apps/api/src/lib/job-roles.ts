import { and, eq, inArray } from "drizzle-orm";
import { employeeJobRoles, jobRoles, type Db } from "@hr/db";

export type JobRoleSummary = { id: string; name: string };

export async function assertJobRolesExist(
  db: Db,
  tenantId: string,
  jobRoleIds: string[],
) {
  const unique = [...new Set(jobRoleIds)];
  if (unique.length === 0) return;
  const found = await db
    .select({ id: jobRoles.id })
    .from(jobRoles)
    .where(and(eq(jobRoles.tenantId, tenantId), inArray(jobRoles.id, unique)));
  if (found.length !== unique.length) {
    throw new Error("One or more job roles were not found");
  }
}

export async function loadJobRolesByEmployeeIds(
  db: Db,
  tenantId: string,
  employeeIds: string[],
): Promise<Map<string, JobRoleSummary[]>> {
  const map = new Map<string, JobRoleSummary[]>();
  if (employeeIds.length === 0) return map;

  const rows = await db
    .select({
      employeeId: employeeJobRoles.employeeId,
      id: jobRoles.id,
      name: jobRoles.name,
    })
    .from(employeeJobRoles)
    .innerJoin(jobRoles, eq(jobRoles.id, employeeJobRoles.jobRoleId))
    .where(
      and(
        eq(employeeJobRoles.tenantId, tenantId),
        inArray(employeeJobRoles.employeeId, employeeIds),
      ),
    )
    .orderBy(jobRoles.name);

  for (const row of rows) {
    const list = map.get(row.employeeId) ?? [];
    list.push({ id: row.id, name: row.name });
    map.set(row.employeeId, list);
  }
  return map;
}

export async function replaceEmployeeJobRoles(
  db: Db,
  tenantId: string,
  employeeId: string,
  jobRoleIds: string[],
): Promise<JobRoleSummary[]> {
  const unique = [...new Set(jobRoleIds)];
  if (unique.length > 0) {
    const found = await db
      .select({ id: jobRoles.id, name: jobRoles.name })
      .from(jobRoles)
      .where(and(eq(jobRoles.tenantId, tenantId), inArray(jobRoles.id, unique)));
    if (found.length !== unique.length) {
      throw new Error("One or more job roles were not found");
    }
  }

  await db
    .delete(employeeJobRoles)
    .where(
      and(
        eq(employeeJobRoles.tenantId, tenantId),
        eq(employeeJobRoles.employeeId, employeeId),
      ),
    );

  if (unique.length === 0) return [];

  await db.insert(employeeJobRoles).values(
    unique.map((jobRoleId) => ({
      tenantId,
      employeeId,
      jobRoleId,
    })),
  );

  const assigned = await loadJobRolesByEmployeeIds(db, tenantId, [employeeId]);
  return assigned.get(employeeId) ?? [];
}
