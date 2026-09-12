import { eq } from "drizzle-orm";
import { branches, employees, hiringStates, users } from "@hr/db";
import { normalizeSystemModuleRoles, type JwtPayload } from "@hr/shared";
import type { App } from "../types.js";

/** Shape mirrored from the web HiringStore snapshot (minus live directory). */
export type HiringPersistedSnapshot = {
  stages: unknown[];
  jobs: unknown[];
  candidates: unknown[];
  interviews: unknown[];
  scorecards: unknown[];
  offers: unknown[];
  templates: unknown[];
  communications: unknown[];
  activity: unknown[];
  bestFitDrafts: unknown[];
};

export type HiringApiSnapshot = HiringPersistedSnapshot & {
  version: number;
  team: Array<{
    id: string;
    name: string;
    email: string | null;
    role: string;
    department: string;
    branchId: string;
    branchName: string;
  }>;
  branches: Array<{ id: string; name: string }>;
};

function departmentFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/sales|account/.test(t)) return "Sales";
  if (/driver|ops|coordinat|dispatch/.test(t)) return "Operations";
  if (/hr|people|admin/.test(t)) return "People";
  return "General";
}

function emptyPersisted(): HiringPersistedSnapshot {
  return {
    stages: [],
    jobs: [],
    candidates: [],
    interviews: [],
    scorecards: [],
    offers: [],
    templates: [],
    communications: [],
    activity: [],
    bestFitDrafts: [],
  };
}

function isPersisted(value: unknown): value is HiringPersistedSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Array.isArray(row.jobs) && Array.isArray(row.candidates);
}

export function mergeHiringPersisted(raw: unknown): HiringPersistedSnapshot {
  const empty = emptyPersisted();
  if (!isPersisted(raw)) return empty;
  return {
    stages: Array.isArray(raw.stages) ? raw.stages : empty.stages,
    jobs: raw.jobs ?? [],
    candidates: raw.candidates ?? [],
    interviews: Array.isArray(raw.interviews) ? raw.interviews : [],
    scorecards: Array.isArray(raw.scorecards) ? raw.scorecards : [],
    offers: Array.isArray(raw.offers) ? raw.offers : [],
    templates: Array.isArray(raw.templates) ? raw.templates : [],
    communications: Array.isArray(raw.communications) ? raw.communications : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
    bestFitDrafts: Array.isArray(raw.bestFitDrafts) ? raw.bestFitDrafts : [],
  };
}

export function persistableHiringState(
  body: Record<string, unknown>,
): HiringPersistedSnapshot {
  return mergeHiringPersisted({
    stages: body.stages,
    jobs: body.jobs,
    candidates: body.candidates,
    interviews: body.interviews,
    scorecards: body.scorecards,
    offers: body.offers,
    templates: body.templates,
    communications: body.communications,
    activity: body.activity,
    bestFitDrafts: body.bestFitDrafts,
  });
}

async function loadDirectory(app: App, tenantId: string) {
  const empRows = await app.db
    .select({
      id: employees.id,
      name: users.name,
      email: users.email,
      jobTitle: employees.jobTitle,
      role: users.role,
      branchId: employees.branchId,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(eq(employees.tenantId, tenantId));

  const branchRows = await app.db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.tenantId, tenantId));

  const branchNames = new Map(branchRows.map((b) => [b.id, b.name]));

  return {
    branches: branchRows,
    team: empRows.map((row) => {
      const branchId = row.branchId ?? branchRows[0]?.id ?? "";
      return {
        id: row.id,
        name: row.name,
        email: row.email ?? null,
        role: row.jobTitle || row.role || "Employee",
        department: departmentFromTitle(row.jobTitle || row.role || ""),
        branchId,
        branchName: branchNames.get(branchId) ?? branchRows[0]?.name ?? "HQ",
      };
    }),
  };
}

export async function loadHiringSnapshot(
  app: App,
  tenantId: string,
): Promise<HiringApiSnapshot> {
  let row = await app.db.query.hiringStates.findFirst({
    where: eq(hiringStates.tenantId, tenantId),
  });
  if (!row) {
    const seed = emptyPersisted();
    try {
      const [created] = await app.db
        .insert(hiringStates)
        .values({ tenantId, snapshot: seed, version: 1, updatedAt: new Date() })
        .returning();
      row = created;
    } catch {
      row = await app.db.query.hiringStates.findFirst({
        where: eq(hiringStates.tenantId, tenantId),
      });
    }
  }

  const persisted = mergeHiringPersisted(row?.snapshot);
  const directory = await loadDirectory(app, tenantId);
  return {
    ...persisted,
    version: row?.version ?? 1,
    team: directory.team,
    branches: directory.branches,
  };
}

/** Returns null when `expectedVersion` does not match the stored row (conflict). */
export async function saveHiringSnapshot(
  app: App,
  tenantId: string,
  body: Record<string, unknown>,
  expectedVersion: number | undefined,
): Promise<HiringApiSnapshot | null> {
  const snapshot = persistableHiringState(body);
  const existing = await app.db.query.hiringStates.findFirst({
    where: eq(hiringStates.tenantId, tenantId),
  });

  if (existing) {
    if (existing.version !== expectedVersion) {
      return null;
    }
    await app.db
      .update(hiringStates)
      .set({
        snapshot,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(hiringStates.tenantId, tenantId));
  } else {
    await app.db.insert(hiringStates).values({
      tenantId,
      snapshot,
      version: 1,
      updatedAt: new Date(),
    });
  }

  return loadHiringSnapshot(app, tenantId);
}

export function hiringActorMeta(user: JwtPayload) {
  return {
    id: user.sub,
    role: user.role,
    employeeId: user.employeeId,
    systemModuleRoles: normalizeSystemModuleRoles(user.systemModuleRoles),
  };
}
