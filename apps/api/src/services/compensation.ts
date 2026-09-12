import { and, eq, gte, lte, or, isNull } from "drizzle-orm";
import {
  attendanceRecords,
  compensationStates,
  employees,
  users,
} from "@hr/db";
import type { App } from "../types.js";

/** Pay domain persisted per tenant. Employees + clock hours are hydrated live. */
export type CompensationPersistedSnapshot = {
  records: unknown[];
  components: unknown[];
  history: unknown[];
  requests: unknown[];
  variable: unknown[];
  bands: unknown[];
  adjustments: unknown[];
  audit: unknown[];
  period: unknown | null;
};

export type CompensationApiSnapshot = CompensationPersistedSnapshot & {
  version: number;
};

function emptyPersisted(): CompensationPersistedSnapshot {
  return {
    records: [],
    components: [],
    history: [],
    requests: [],
    variable: [],
    bands: [],
    adjustments: [],
    audit: [],
    period: null,
  };
}

function isPersisted(value: unknown): value is CompensationPersistedSnapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Array.isArray(row.records);
}

export function mergeCompensationPersisted(
  raw: unknown,
): CompensationPersistedSnapshot {
  const empty = emptyPersisted();
  if (!isPersisted(raw)) return empty;
  return {
    records: raw.records ?? [],
    components: Array.isArray(raw.components) ? raw.components : [],
    history: Array.isArray(raw.history) ? raw.history : [],
    requests: Array.isArray(raw.requests) ? raw.requests : [],
    variable: Array.isArray(raw.variable) ? raw.variable : [],
    bands: Array.isArray(raw.bands) ? raw.bands : [],
    adjustments: Array.isArray(raw.adjustments) ? raw.adjustments : [],
    audit: Array.isArray(raw.audit) ? raw.audit : [],
    period: raw.period ?? null,
  };
}

export function persistableCompensationState(
  body: Record<string, unknown>,
): CompensationPersistedSnapshot {
  return mergeCompensationPersisted({
    records: body.records,
    components: body.components,
    history: body.history,
    requests: body.requests,
    variable: body.variable,
    bands: body.bands,
    adjustments: body.adjustments,
    audit: body.audit,
    period: body.period,
  });
}

export async function loadCompensationSnapshot(
  app: App,
  tenantId: string,
): Promise<CompensationApiSnapshot> {
  let row = await app.db.query.compensationStates.findFirst({
    where: eq(compensationStates.tenantId, tenantId),
  });
  if (!row) {
    const seed = emptyPersisted();
    try {
      const [created] = await app.db
        .insert(compensationStates)
        .values({ tenantId, snapshot: seed, version: 1, updatedAt: new Date() })
        .returning();
      row = created;
    } catch {
      row = await app.db.query.compensationStates.findFirst({
        where: eq(compensationStates.tenantId, tenantId),
      });
    }
  }
  return {
    ...mergeCompensationPersisted(row?.snapshot),
    version: row?.version ?? 1,
  };
}

/** Returns null when `expectedVersion` does not match the stored row (conflict). */
export async function saveCompensationSnapshot(
  app: App,
  tenantId: string,
  body: Record<string, unknown>,
  expectedVersion: number | undefined,
): Promise<CompensationApiSnapshot | null> {
  const snapshot = persistableCompensationState(body);
  const existing = await app.db.query.compensationStates.findFirst({
    where: eq(compensationStates.tenantId, tenantId),
  });

  if (existing) {
    if (existing.version !== expectedVersion) {
      return null;
    }
    await app.db
      .update(compensationStates)
      .set({
        snapshot,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(compensationStates.tenantId, tenantId));
  } else {
    await app.db.insert(compensationStates).values({
      tenantId,
      snapshot,
      version: 1,
      updatedAt: new Date(),
    });
  }

  return loadCompensationSnapshot(app, tenantId);
}

function periodBounds(period: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const start = `${m[1]}-${m[2]}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${m[1]}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function csvEscape(value: string | number) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function num(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hoursFromShifts(
  shifts: Array<{ clockInAt: Date; clockOutAt: Date | null }>,
) {
  let total = 0;
  for (const s of shifts) {
    if (!s.clockOutAt) continue;
    const ms = s.clockOutAt.getTime() - s.clockInAt.getTime();
    if (ms > 0) total += ms / 3_600_000;
  }
  return Math.round(total * 100) / 100;
}

/** Build payroll CSV for a YYYY-MM period from the compensation snapshot (+ attendance hours when available). */
export async function buildPayrollExportCsv(
  app: App,
  tenantId: string,
  period: string,
): Promise<{ csv: string; filename: string } | { error: string }> {
  const bounds = periodBounds(period);
  if (!bounds) return { error: "period must be YYYY-MM" };

  const snapshot = await loadCompensationSnapshot(app, tenantId);
  const empRows = await app.db
    .select({
      id: employees.id,
      name: users.name,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(eq(employees.tenantId, tenantId));
  const nameById = new Map(empRows.map((e) => [e.id, e.name]));

  const from = new Date(`${bounds.start}T00:00:00.000Z`);
  const to = new Date(`${bounds.end}T23:59:59.999Z`);
  const attendance = await app.db.query.attendanceRecords.findMany({
    where: and(
      eq(attendanceRecords.tenantId, tenantId),
      or(
        and(
          gte(attendanceRecords.clockInAt, from),
          lte(attendanceRecords.clockInAt, to),
        ),
        and(
          isNull(attendanceRecords.clockOutAt),
          lte(attendanceRecords.clockInAt, to),
        ),
      ),
    ),
    limit: 5000,
  });
  const shiftsByEmp = new Map<
    string,
    Array<{ clockInAt: Date; clockOutAt: Date | null }>
  >();
  for (const row of attendance) {
    const list = shiftsByEmp.get(row.employeeId) ?? [];
    list.push({ clockInAt: row.clockInAt, clockOutAt: row.clockOutAt });
    shiftsByEmp.set(row.employeeId, list);
  }

  const adjByEmp = new Map<string, number>();
  for (const raw of snapshot.adjustments) {
    const adj = asRecord(raw);
    if (!adj || typeof adj.employeeId !== "string") continue;
    adjByEmp.set(adj.employeeId, num(adj.workedHours));
  }

  const variableByEmp = new Map<string, number>();
  for (const raw of snapshot.variable) {
    const v = asRecord(raw);
    if (!v || typeof v.employeeId !== "string") continue;
    if (v.status !== "approved") continue;
    const start =
      typeof v.payoutPeriodStart === "string" ? v.payoutPeriodStart : "";
    const end =
      typeof v.payoutPeriodEnd === "string" ? v.payoutPeriodEnd : "";
    if (end < bounds.start || start > bounds.end) continue;
    variableByEmp.set(
      v.employeeId,
      (variableByEmp.get(v.employeeId) ?? 0) + num(v.amount),
    );
  }

  const lines = [
    "employeeName,employeeId,basePay,variable,hours,total,currency",
  ];

  for (const raw of snapshot.records) {
    const rec = asRecord(raw);
    if (!rec || typeof rec.employeeId !== "string") continue;
    const employeeId = rec.employeeId;
    const employeeName = nameById.get(employeeId) ?? employeeId;
    const basePay = num(rec.baseAmount);
    const variable = variableByEmp.get(employeeId) ?? 0;
    const fromAdj = adjByEmp.get(employeeId);
    const hours =
      fromAdj != null && fromAdj > 0
        ? fromAdj
        : hoursFromShifts(shiftsByEmp.get(employeeId) ?? []);
    const total = Math.round((basePay + variable) * 100) / 100;
    const currency =
      typeof rec.currency === "string" && rec.currency ? rec.currency : "EGP";
    lines.push(
      [
        csvEscape(employeeName),
        csvEscape(employeeId),
        csvEscape(basePay),
        csvEscape(variable),
        csvEscape(hours),
        csvEscape(total),
        csvEscape(currency),
      ].join(","),
    );
  }

  return {
    csv: `${lines.join("\n")}\n`,
    filename: `payroll-export-${period}.csv`,
  };
}
