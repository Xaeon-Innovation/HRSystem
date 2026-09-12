import {
  bandInsight,
  buildPayslip,
  changeDelta,
  dailyRate,
  findBandFor,
  isDeduction,
  overtimeHourlyRate,
  recurringAllowances,
  recurringDeductions,
  toMonthlyEquivalent,
  totalCompensation,
} from "./calc";
import { employeeCodeFrom, newId, todayIso } from "./format";
import {
  CURRENT_PERIOD,
  MOCK_ADJUSTMENTS,
  MOCK_AUDIT,
  MOCK_CLOCK_SHIFTS,
  MOCK_COMPONENTS,
  MOCK_EMPLOYEES,
  MOCK_HISTORY,
  MOCK_RECORDS,
  MOCK_REQUESTS,
  MOCK_VARIABLE,
  SALARY_BANDS,
  defaultRecordFor,
  departmentFromTitle,
} from "./mock";
import { buildOverview, buildReport, isRecent } from "./reports";
import {
  appliesToBase,
  canAccessCompensationPage,
  canApprove,
  canEditSensitive,
  canProposeChange,
  canTransition,
  canViewEmployee,
  isAdminActor,
  isVariableChange,
  recordStatusAfterChange,
} from "./workflow";
import type { ClockShift } from "./types";
import { groupShiftsByEmployee, summarizeHours } from "./hours";
import type {
  ChangeRequest,
  ChangeRequestDraft,
  CompActor,
  CompAuditEvent,
  CompComponent,
  CompEmployee,
  CompProfile,
  CompensationRecord,
  ComponentDraft,
  EmployeeFilters,
  PaySetupDraft,
  PayrollInputRow,
  PeriodAdjustment,
  SalaryBand,
  SalaryHistoryEntry,
  VariablePay,
  VariablePayDraft,
} from "./types";

const STORAGE_KEY = "hr_compensation_store_v2";

export type Snapshot = {
  employees: CompEmployee[];
  records: CompensationRecord[];
  components: CompComponent[];
  history: SalaryHistoryEntry[];
  requests: ChangeRequest[];
  variable: VariablePay[];
  bands: SalaryBand[];
  adjustments: PeriodAdjustment[];
  clockShifts: ClockShift[];
  audit: CompAuditEvent[];
  period: typeof CURRENT_PERIOD;
};

/** Server-persisted pay domain — employees & clock hours are hydrated live. */
export type CompensationPersistedSnapshot = Omit<
  Snapshot,
  "employees" | "clockShifts"
>;

export function persistableCompensationState(
  data: Snapshot,
): CompensationPersistedSnapshot {
  return {
    records: data.records,
    components: data.components,
    history: data.history,
    requests: data.requests,
    variable: data.variable,
    bands: data.bands,
    adjustments: data.adjustments,
    audit: data.audit,
    period: data.period,
  };
}

function applyClockHoursToSnapshot(data: Snapshot, asOf?: string) {
  const byEmp = groupShiftsByEmployee(data.clockShifts);
  for (const [employeeId, shifts] of byEmp) {
    const rec = data.records.find((r) => r.employeeId === employeeId);
    const hours = summarizeHours(shifts, data.period.start, data.period.end, {
      hoursPerWeek: rec?.hoursPerWeek,
      asOf,
      employeeId,
    });
    let adj = data.adjustments.find((a) => a.employeeId === employeeId);
    if (!adj) {
      adj = {
        employeeId,
        overtimeHours: 0,
        regularHours: 0,
        workedHours: 0,
        openShifts: 0,
        unpaidLeaveDays: 0,
        absenceDays: 0,
        attendancePenalty: 0,
        manualAdjustment: 0,
        manualNote: "",
      };
      data.adjustments.push(adj);
    }
    adj.regularHours = hours.regularHours;
    adj.overtimeHours = hours.overtimeHours;
    adj.workedHours = hours.totalHours;
    adj.openShifts = hours.openShiftCount;
  }
}

function emptySnapshot(): Snapshot {
  const data: Snapshot = {
    employees: structuredClone(MOCK_EMPLOYEES),
    records: structuredClone(MOCK_RECORDS),
    components: structuredClone(MOCK_COMPONENTS),
    history: structuredClone(MOCK_HISTORY),
    requests: structuredClone(MOCK_REQUESTS),
    variable: structuredClone(MOCK_VARIABLE),
    bands: structuredClone(SALARY_BANDS),
    adjustments: structuredClone(MOCK_ADJUSTMENTS),
    clockShifts: structuredClone(MOCK_CLOCK_SHIFTS),
    audit: structuredClone(MOCK_AUDIT),
    period: structuredClone(CURRENT_PERIOD),
  };
  applyClockHoursToSnapshot(data, `${CURRENT_PERIOD.end}T18:00:00.000+03:00`);
  return data;
}

/** Fresh tenant: bands + period only; pay records come from setup / hydrate. */
export function emptyServerSnapshot(): Snapshot {
  return {
    employees: [],
    records: [],
    components: [],
    history: [],
    requests: [],
    variable: [],
    bands: structuredClone(SALARY_BANDS),
    adjustments: [],
    clockShifts: [],
    audit: [],
    period: structuredClone(CURRENT_PERIOD),
  };
}

function loadSnapshot(): Snapshot {
  if (typeof window === "undefined") return emptyServerSnapshot();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyServerSnapshot();
    const parsed = JSON.parse(raw) as Snapshot;
    if (!parsed.records) return emptyServerSnapshot();
    if (!parsed.employees) parsed.employees = [];
    if (!parsed.clockShifts) parsed.clockShifts = [];
    if (!parsed.bands?.length) parsed.bands = structuredClone(SALARY_BANDS);
    if (!parsed.period) parsed.period = structuredClone(CURRENT_PERIOD);
    for (const adj of parsed.adjustments ?? []) {
      adj.regularHours ??= 0;
      adj.workedHours ??= 0;
      adj.openShifts ??= 0;
    }
    applyClockHoursToSnapshot(parsed);
    return parsed;
  } catch {
    return emptyServerSnapshot();
  }
}

function saveSnapshot(data: Snapshot) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

type RemotePersistHandler = (
  snapshot: CompensationPersistedSnapshot,
  expectedVersion: number,
) => void;

function nowIso() {
  return new Date().toISOString();
}

function actorIsManager(data: Snapshot, actor: CompActor): boolean {
  const selfId = actor.employeeId ?? actor.id;
  return data.employees.some((e) => e.managerId === selfId);
}

export class CompensationStore {
  private data: Snapshot;
  private remotePersist: RemotePersistHandler | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressRemote = false;
  private version = 1;

  constructor(seed?: Snapshot) {
    this.data = seed ?? loadSnapshot();
  }

  setRemotePersist(handler: RemotePersistHandler | null) {
    this.remotePersist = handler;
  }

  getVersion() {
    return this.version;
  }

  setVersion(version: number) {
    this.version = version;
  }

  /** Replace pay domain from GET /v1/compensation (does not push back). */
  replaceFromServer(
    input: Partial<CompensationPersistedSnapshot> & {
      records?: CompensationRecord[];
      version?: number;
    },
  ) {
    this.suppressRemote = true;
    const base = emptyServerSnapshot();
    this.data = {
      ...base,
      employees: [],
      clockShifts: [],
      records: (input.records as CompensationRecord[] | undefined) ?? [],
      components: (input.components as CompComponent[] | undefined) ?? [],
      history: (input.history as SalaryHistoryEntry[] | undefined) ?? [],
      requests: (input.requests as ChangeRequest[] | undefined) ?? [],
      variable: (input.variable as VariablePay[] | undefined) ?? [],
      bands:
        (input.bands as SalaryBand[] | undefined)?.length
          ? (input.bands as SalaryBand[])
          : base.bands,
      adjustments: (input.adjustments as PeriodAdjustment[] | undefined) ?? [],
      audit: (input.audit as CompAuditEvent[] | undefined) ?? [],
      period:
        (input.period as typeof CURRENT_PERIOD | undefined) ?? base.period,
    };
    if (typeof input.version === "number") this.version = input.version;
    for (const adj of this.data.adjustments) {
      adj.regularHours ??= 0;
      adj.workedHours ??= 0;
      adj.openShifts ??= 0;
    }
    saveSnapshot(this.data);
    this.suppressRemote = false;
  }

  private persist() {
    saveSnapshot(this.data);
    if (this.suppressRemote || !this.remotePersist) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.remotePersist?.(persistableCompensationState(this.data), this.version);
    }, 350);
  }

  snapshot(): Snapshot {
    return this.data;
  }

  period() {
    return this.data.period;
  }

  bands() {
    return this.data.bands;
  }

  isManager(actor: CompActor) {
    return actorIsManager(this.data, actor);
  }

  canAccess(actor: CompActor) {
    return canAccessCompensationPage(actor, this.isManager(actor));
  }

  hydrateDirectory(input: {
    employees?: Array<{
      id: string;
      name: string;
      email?: string | null;
      jobTitle?: string | null;
      role?: string;
      status?: string;
      hireDate?: string | null;
      branchId?: string | null;
    }>;
    branches?: Array<{ id: string; name: string }>;
    current?: CompActor | null;
  }) {
    const branches = new Map((input.branches ?? []).map((b) => [b.id, b.name]));
    const existing = new Map(this.data.employees.map((e) => [e.id, e]));
    const manager =
      this.data.employees.find((e) => e.role.toLowerCase().includes("people")) ??
      this.data.employees[0];

    for (const emp of input.employees ?? []) {
      if (existing.has(emp.id)) {
        const prev = existing.get(emp.id)!;
        prev.name = emp.name;
        prev.email = emp.email ?? prev.email;
        prev.role = emp.jobTitle || emp.role || prev.role;
        if (emp.branchId) {
          prev.branchId = emp.branchId;
          prev.branchName = branches.get(emp.branchId) ?? prev.branchName;
        }
        continue;
      }
      const branchId = emp.branchId || "br-hq";
      const next: CompEmployee = {
        id: emp.id,
        employeeCode: employeeCodeFrom(emp.id, emp.name),
        name: emp.name,
        email: emp.email ?? null,
        role: emp.jobTitle || emp.role || "Employee",
        department: departmentFromTitle(emp.jobTitle || emp.role || ""),
        branchId,
        branchName: branches.get(branchId) ?? "HQ",
        managerId: manager?.id ?? null,
        managerName: manager?.name ?? null,
        hireDate: emp.hireDate ?? todayIso(),
        employmentType: "full_time",
        status: emp.status === "inactive" ? "inactive" : "active",
        latestKpiScore: null,
        lastAppraisalResult: null,
        lastAppraisalDate: null,
      };
      this.data.employees.push(next);
      if (!this.data.records.some((r) => r.employeeId === next.id)) {
        this.data.records.push(defaultRecordFor(next));
      }
    }

    // Directory is always reloaded from employees APIs — cache locally only.
    saveSnapshot(this.data);
  }

  private visibleEmployeeIds(actor: CompActor): Set<string> | null {
    if (isAdminActor(actor)) return null;
    const selfId = actor.employeeId ?? actor.id;
    const ids = new Set(
      this.data.employees.filter((e) => e.managerId === selfId || e.id === selfId).map((e) => e.id),
    );
    return ids;
  }

  employees(actor?: CompActor): CompEmployee[] {
    let rows = this.data.employees.filter((e) => e.status === "active");
    if (actor && !isAdminActor(actor)) {
      const ids = this.visibleEmployeeIds(actor);
      rows = rows.filter((e) => ids?.has(e.id));
    }
    return rows;
  }

  employee(id: string) {
    return this.data.employees.find((e) => e.id === id);
  }

  record(employeeId: string) {
    return this.data.records.find((r) => r.employeeId === employeeId);
  }

  components(employeeId?: string) {
    return this.data.components.filter((c) => !employeeId || c.employeeId === employeeId);
  }

  history(employeeId?: string) {
    return [...this.data.history]
      .filter((h) => !employeeId || h.employeeId === employeeId)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || b.createdAt.localeCompare(a.createdAt));
  }

  variable(employeeId?: string) {
    return [...this.data.variable]
      .filter((v) => !employeeId || v.employeeId === employeeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  requests(actor?: CompActor, status?: ChangeRequest["status"] | "") {
    let rows = [...this.data.requests];
    if (actor && !isAdminActor(actor)) {
      const ids = this.visibleEmployeeIds(actor);
      rows = rows.filter((r) => ids?.has(r.employeeId));
    }
    if (status) rows = rows.filter((r) => r.status === status);
    return rows.sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  }

  request(id: string) {
    return this.data.requests.find((r) => r.id === id);
  }

  audit(employeeId?: string) {
    return [...this.data.audit]
      .filter((a) => !employeeId || a.employeeId === employeeId)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  profile(employeeId: string): CompProfile | null {
    const employee = this.employee(employeeId);
    const record = this.record(employeeId);
    if (!employee || !record) return null;
    const components = this.components(employeeId);
    const history = this.history(employeeId);
    const variable = this.variable(employeeId);
    const period = this.data.period;
    const monthlyEquivalent = toMonthlyEquivalent(record);
    const band = bandInsight(
      monthlyEquivalent,
      findBandFor(this.data.bands, record.gradeId, employee.role),
    );
    const adj = this.data.adjustments.find((a) => a.employeeId === employeeId) ?? null;
    const payslip = buildPayslip({
      record,
      components,
      variable,
      adjustment: adj,
      periodStart: period.start,
      periodEnd: period.end,
    });
    const hours = summarizeHours(
      this.data.clockShifts.filter((s) => s.employeeId === employeeId),
      period.start,
      period.end,
      { hoursPerWeek: record.hoursPerWeek, employeeId },
    );
    return {
      employee,
      record,
      components,
      history,
      variable,
      band,
      monthlyEquivalent,
      totalCompensation: totalCompensation(
        record,
        components,
        variable,
        period.start,
        period.end,
        adj,
      ),
      payslip,
      hours: hours.shiftCount > 0 || record.payStructure === "hourly" ? hours : null,
    };
  }

  filteredEmployees(filters: EmployeeFilters, actor: CompActor) {
    const q = filters.search.trim().toLowerCase();
    return this.employees(actor).filter((emp) => {
      const rec = this.record(emp.id);
      if (!rec) return false;
      if (
        q &&
        !`${emp.name} ${emp.employeeCode} ${emp.role} ${emp.department}`.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (filters.department && emp.department !== filters.department) return false;
      if (filters.branchId && emp.branchId !== filters.branchId) return false;
      if (filters.payStructure && rec.payStructure !== filters.payStructure) return false;
      if (filters.status && rec.status !== filters.status) return false;
      if (filters.band !== "all") {
        const monthly = toMonthlyEquivalent(rec);
        const pos = bandInsight(monthly, findBandFor(this.data.bands, rec.gradeId, emp.role))
          .position;
        if (pos !== filters.band) return false;
      }
      return true;
    });
  }

  overview(actor: CompActor, asOf = todayIso()) {
    const ids = new Set(this.employees(actor).map((e) => e.id));
    return buildOverview({
      employees: this.data.employees.filter((e) => ids.has(e.id)),
      records: this.data.records.filter((r) => ids.has(r.employeeId)),
      components: this.data.components.filter((c) => ids.has(c.employeeId)),
      variable: this.data.variable.filter((v) => ids.has(v.employeeId)),
      requests: this.requests(actor),
      history: this.data.history.filter((h) => ids.has(h.employeeId)),
      bands: this.data.bands,
      adjustments: this.data.adjustments,
      period: this.data.period,
      asOf,
    });
  }

  report(actor: CompActor, asOf = todayIso()) {
    const ids = new Set(this.employees(actor).map((e) => e.id));
    return buildReport({
      employees: this.data.employees.filter((e) => ids.has(e.id)),
      records: this.data.records.filter((r) => ids.has(r.employeeId)),
      components: this.data.components.filter((c) => ids.has(c.employeeId)),
      variable: this.data.variable.filter((v) => ids.has(v.employeeId)),
      requests: this.requests(actor),
      history: this.data.history.filter((h) => ids.has(h.employeeId)),
      bands: this.data.bands,
      adjustments: this.data.adjustments,
      period: this.data.period,
      asOf,
    });
  }

  payrollRows(actor: CompActor): PayrollInputRow[] {
    const period = this.data.period;
    return this.employees(actor)
      .map((emp) => {
        const rec = this.record(emp.id);
        if (!rec) return null;
        const comps = this.components(emp.id);
        const adj = this.data.adjustments.find((a) => a.employeeId === emp.id) ?? null;
        const breakdown = buildPayslip({
          record: rec,
          components: comps,
          variable: this.variable(emp.id),
          adjustment: adj,
          periodStart: period.start,
          periodEnd: period.end,
        });
        const base = toMonthlyEquivalent(rec);
        const leaveDays = adj?.unpaidLeaveDays ?? 0;
        const unpaid = rec.payStructure === "hourly" ? 0 : leaveDays * dailyRate(rec);
        const absence = rec.payStructure === "hourly" ? 0 : (adj?.absenceDays ?? 0) * dailyRate(rec);
        const worked = adj?.workedHours ?? 0;
        const hoursNote =
          rec.payStructure === "hourly"
            ? worked > 0
              ? `${worked.toFixed(1)}h from clock in/out${adj?.openShifts ? ` · ${adj.openShifts} open` : ""}`
              : "No clock records this cycle"
            : leaveDays > 0
              ? `${leaveDays} unpaid day${leaveDays === 1 ? "" : "s"} this cycle`
              : "No unpaid leave this cycle";
        return {
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          branchName: emp.branchName,
          currency: rec.currency,
          payStructure: rec.payStructure,
          hourlyRate: rec.payStructure === "hourly" ? rec.baseAmount : null,
          workedHours: worked,
          regularHours: adj?.regularHours ?? 0,
          overtimeHoursWorked: adj?.overtimeHours ?? 0,
          openShifts: adj?.openShifts ?? 0,
          baseSalary: breakdown.base,
          allowances: breakdown.allowances,
          overtime: breakdown.overtime,
          incentives: breakdown.incentives,
          unpaidLeaveDeduction: unpaid,
          absenceDeduction: absence,
          attendanceImpact: adj?.attendancePenalty ?? 0,
          otherDeductions: recurringDeductions(comps, base, period.end),
          manualAdjustments: adj?.manualAdjustment ?? 0,
          gross: breakdown.gross,
          totalDeductions: breakdown.deductions,
          net: breakdown.net,
          leaveImpactNote: hoursNote,
          breakdown,
        } satisfies PayrollInputRow;
      })
      .filter((row): row is PayrollInputRow => Boolean(row));
  }

  private pushAudit(event: Omit<CompAuditEvent, "id" | "at"> & { at?: string }) {
    this.data.audit.push({
      ...event,
      id: newId("aud"),
      at: event.at ?? nowIso(),
    });
  }

  ingestClockHours(records: ClockShift[]) {
    const incomingIds = new Set(records.map((r) => r.employeeId));
    this.data.clockShifts = [
      ...this.data.clockShifts.filter((s) => !incomingIds.has(s.employeeId)),
      ...records.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        clockInAt: r.clockInAt,
        clockOutAt: r.clockOutAt,
      })),
    ];
    applyClockHoursToSnapshot(this.data);
    this.persist();
  }

  clockShifts(employeeId?: string) {
    return this.data.clockShifts.filter((s) => !employeeId || s.employeeId === employeeId);
  }

  cycleHours(employeeId: string) {
    return this.data.adjustments.find((a) => a.employeeId === employeeId) ?? null;
  }

  setPaySetup(draft: PaySetupDraft, actor: CompActor) {
    if (!canEditSensitive(actor)) {
      throw new Error("Only HR admins can change pay structure and hourly rates.");
    }
    const rec = this.record(draft.employeeId);
    if (!rec) throw new Error("Compensation record not found.");
    if (draft.baseAmount < 0) throw new Error("Rate cannot be negative.");
    if (draft.payStructure === "hourly" && draft.baseAmount <= 0) {
      throw new Error("Hourly rate must be greater than zero.");
    }
    if (draft.hoursPerWeek <= 0) throw new Error("Weekly hours must be greater than zero.");
    const prev = `${rec.payStructure} ${rec.baseAmount}`;
    rec.payStructure = draft.payStructure;
    rec.baseAmount = draft.baseAmount;
    rec.hoursPerWeek = draft.hoursPerWeek;
    rec.updatedAt = nowIso();
    if (draft.payStructure === "hourly") rec.payFrequency = "monthly";
    if (draft.notes?.trim()) rec.notes = draft.notes.trim();
    applyClockHoursToSnapshot(this.data);
    this.pushAudit({
      entityType: "record",
      entityId: rec.id,
      employeeId: rec.employeeId,
      action: "updated",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: prev,
      newValue: `${draft.payStructure} ${draft.baseAmount}`,
      reason: "pay_setup",
      note: draft.payStructure === "hourly" ? "Hourly rate set from clock-based pay" : "Pay structure updated",
    });
    this.persist();
    return rec;
  }

  submitChange(draft: ChangeRequestDraft, actor: CompActor): ChangeRequest {
    if (!canProposeChange(actor, this.isManager(actor))) {
      throw new Error("You cannot propose compensation changes.");
    }
    const emp = this.employee(draft.employeeId);
    const rec = this.record(draft.employeeId);
    if (!emp || !rec) throw new Error("Employee compensation record not found.");
    if (!canViewEmployee(actor, emp, this.isManager(actor))) {
      throw new Error("You cannot change this employee.");
    }
    if (rec.status === "frozen" && draft.changeType !== "salary_freeze") {
      throw new Error("This salary is frozen. Unfreeze before proposing another change.");
    }
    if (draft.newAmount < 0) throw new Error("Amount cannot be negative.");
    if (!draft.effectiveDate) throw new Error("Effective date is required.");
    if (!draft.reason.trim()) throw new Error("A reason is required.");

    const id = newId("cr");
    const now = nowIso();
    const status = draft.asDraft ? "draft" : "pending";
    const request: ChangeRequest = {
      id,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      branchName: emp.branchName,
      changeType: draft.changeType,
      previousAmount: rec.baseAmount,
      newAmount: draft.newAmount,
      currency: rec.currency,
      effectiveDate: draft.effectiveDate,
      reason: draft.reason.trim(),
      justification: draft.justification.trim(),
      reviewCycleId: draft.reviewCycleId,
      reviewCycleName: draft.reviewCycleName,
      kpiScore: emp.latestKpiScore,
      componentKind: draft.componentKind,
      status,
      submittedById: actor.id,
      submittedByName: actor.name,
      submittedAt: draft.asDraft ? null : now,
      decidedById: null,
      decidedByName: null,
      decidedAt: null,
      decisionNote: null,
      comments: [],
      audit: [],
      createdAt: now,
      updatedAt: now,
    };
    const event: CompAuditEvent = {
      id: newId("aud"),
      entityType: "request",
      entityId: id,
      employeeId: emp.id,
      action: draft.asDraft ? "created" : "submitted",
      actorId: actor.id,
      actorName: actor.name,
      at: now,
      oldValue: String(rec.baseAmount),
      newValue: String(draft.newAmount),
      reason: draft.changeType,
      note: draft.reason.trim(),
    };
    request.audit.push(event);
    this.data.audit.push(event);
    this.data.requests.unshift(request);
    if (!draft.asDraft) {
      rec.status = "pending_change";
      rec.updatedAt = now;
    }
    this.persist();
    return request;
  }

  decide(
    requestId: string,
    decision: "approved" | "rejected" | "returned",
    actor: CompActor,
    note: string,
  ) {
    if (!canApprove(actor)) throw new Error("Only HR admins can decide salary changes.");
    const req = this.request(requestId);
    if (!req) throw new Error("Change request not found.");
    if (!canTransition(req.status, decision)) {
      throw new Error(`Cannot ${decision} a ${req.status} request.`);
    }
    if ((decision === "rejected" || decision === "returned") && !note.trim()) {
      throw new Error("A note is required.");
    }
    const now = nowIso();
    req.status = decision;
    req.decidedById = actor.id;
    req.decidedByName = actor.name;
    req.decidedAt = now;
    req.decisionNote = note.trim() || null;
    req.updatedAt = now;
    const event: CompAuditEvent = {
      id: newId("aud"),
      entityType: "request",
      entityId: req.id,
      employeeId: req.employeeId,
      action: decision,
      actorId: actor.id,
      actorName: actor.name,
      at: now,
      oldValue: String(req.previousAmount),
      newValue: String(req.newAmount),
      reason: req.changeType,
      note: note.trim(),
    };
    req.audit.push(event);
    this.data.audit.push(event);

    const rec = this.record(req.employeeId);
    if (decision === "approved" && rec) {
      this.applyApprovedChange(req, rec, actor, now);
    } else if (rec && rec.status === "pending_change") {
      const stillPending = this.data.requests.some(
        (r) => r.employeeId === rec.employeeId && r.status === "pending" && r.id !== req.id,
      );
      rec.status = stillPending ? "pending_change" : "active";
      rec.updatedAt = now;
    }
    this.persist();
    return req;
  }

  private applyApprovedChange(
    req: ChangeRequest,
    rec: CompensationRecord,
    actor: CompActor,
    now: string,
  ) {
    const prev = rec.baseAmount;
    if (appliesToBase(req.changeType)) {
      rec.baseAmount = req.newAmount;
      rec.effectiveDate = req.effectiveDate;
    }
    rec.status = recordStatusAfterChange(req.changeType, rec.status);
    rec.updatedAt = now;

    const delta = changeDelta(prev, rec.baseAmount);
    this.data.history.unshift({
      id: newId("sh"),
      employeeId: req.employeeId,
      changeType: req.changeType,
      previousAmount: req.previousAmount,
      newAmount: req.newAmount,
      changeAmount: delta.changeAmount,
      changePercent: delta.changePercent,
      effectiveDate: req.effectiveDate,
      reasonCode: req.changeType,
      reason: req.reason,
      reviewCycleId: req.reviewCycleId,
      reviewCycleName: req.reviewCycleName,
      submittedById: req.submittedById,
      submittedByName: req.submittedByName,
      approvedById: actor.id,
      approvedByName: actor.name,
      requestId: req.id,
      createdAt: now,
      updatedAt: now,
    });

    if (isVariableChange(req.changeType)) {
      const emp = this.employee(req.employeeId);
      this.data.variable.unshift({
        id: newId("vp"),
        employeeId: req.employeeId,
        employeeName: emp?.name ?? req.employeeName,
        department: req.department,
        kind: req.changeType === "bonus_payout" ? "bonus" : "commission",
        bonusType: req.changeType === "bonus_payout" ? "spot" : null,
        amount: req.newAmount,
        currency: req.currency,
        cycle: "one_off",
        commissionFormula: null,
        kpiLinked: req.kpiScore != null,
        kpiScore: req.kpiScore,
        payoutPeriodStart: this.data.period.start,
        payoutPeriodEnd: this.data.period.end,
        status: "approved",
        notes: req.reason,
        submittedById: req.submittedById,
        submittedByName: req.submittedByName,
        approvedById: actor.id,
        approvedByName: actor.name,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (req.changeType === "temporary_allowance" && req.componentKind) {
      this.data.components.push({
        id: newId("cc"),
        employeeId: req.employeeId,
        kind: req.componentKind,
        label: req.reason,
        amount: req.newAmount,
        amountType: "fixed",
        recurring: true,
        effectiveFrom: req.effectiveDate,
        effectiveTo: null,
        status: "active",
        note: req.justification,
      });
    }

    if (req.changeType === "deduction_setup") {
      this.data.components.push({
        id: newId("cc"),
        employeeId: req.employeeId,
        kind: req.componentKind && isDeduction(req.componentKind) ? req.componentKind : "custom_deduction",
        label: req.reason,
        amount: req.newAmount,
        amountType: "fixed",
        recurring: true,
        effectiveFrom: req.effectiveDate,
        effectiveTo: null,
        status: "active",
        note: req.justification,
      });
    }

    this.pushAudit({
      entityType: "record",
      entityId: rec.id,
      employeeId: rec.employeeId,
      action: "updated",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: String(prev),
      newValue: String(rec.baseAmount),
      reason: req.changeType,
      note: "Applied from approved change request",
    });
  }

  addComment(requestId: string, actor: CompActor, body: string) {
    const req = this.request(requestId);
    if (!req) throw new Error("Change request not found.");
    if (!body.trim()) throw new Error("Comment cannot be empty.");
    const now = nowIso();
    req.comments.push({
      id: newId("cmt"),
      requestId,
      authorId: actor.id,
      authorName: actor.name,
      body: body.trim(),
      createdAt: now,
    });
    req.updatedAt = now;
    this.pushAudit({
      entityType: "request",
      entityId: requestId,
      employeeId: req.employeeId,
      action: "commented",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: null,
      newValue: null,
      reason: req.changeType,
      note: body.trim(),
    });
    this.persist();
  }

  addComponent(draft: ComponentDraft, actor: CompActor) {
    if (!canEditSensitive(actor) && !canProposeChange(actor, this.isManager(actor))) {
      throw new Error("You cannot add compensation components.");
    }
    const emp = this.employee(draft.employeeId);
    if (!emp) throw new Error("Employee not found.");
    const now = nowIso();
    const row: CompComponent = {
      id: newId("cc"),
      employeeId: draft.employeeId,
      kind: draft.kind,
      label: draft.label.trim() || draft.kind,
      amount: draft.amount,
      amountType: draft.amountType,
      recurring: draft.recurring,
      effectiveFrom: draft.effectiveFrom,
      effectiveTo: draft.effectiveTo,
      status: "active",
      note: draft.note.trim(),
    };
    this.data.components.push(row);
    this.pushAudit({
      entityType: "component",
      entityId: row.id,
      employeeId: draft.employeeId,
      action: "component_added",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: null,
      newValue: String(draft.amount),
      reason: draft.kind,
      note: draft.label,
    });
    void now;
    this.persist();
    return row;
  }

  endComponent(id: string, actor: CompActor) {
    if (!canEditSensitive(actor)) throw new Error("Only HR admins can end components.");
    const row = this.data.components.find((c) => c.id === id);
    if (!row) throw new Error("Component not found.");
    row.status = "ended";
    row.effectiveTo = todayIso();
    this.pushAudit({
      entityType: "component",
      entityId: row.id,
      employeeId: row.employeeId,
      action: "component_ended",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: "active",
      newValue: "ended",
      reason: row.kind,
      note: row.label,
    });
    this.persist();
  }

  submitVariable(draft: VariablePayDraft, actor: CompActor): VariablePay {
    if (!canProposeChange(actor, this.isManager(actor))) {
      throw new Error("You cannot submit variable pay.");
    }
    const emp = this.employee(draft.employeeId);
    if (!emp) throw new Error("Employee not found.");
    if (draft.amount <= 0) throw new Error("Amount must be greater than zero.");
    const now = nowIso();
    const row: VariablePay = {
      id: newId("vp"),
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      kind: draft.kind,
      bonusType: draft.bonusType,
      amount: draft.amount,
      currency: this.record(emp.id)?.currency ?? "EGP",
      cycle: draft.cycle,
      commissionFormula: draft.commissionFormula,
      kpiLinked: draft.kpiLinked,
      kpiScore: emp.latestKpiScore,
      payoutPeriodStart: draft.payoutPeriodStart,
      payoutPeriodEnd: draft.payoutPeriodEnd,
      status: "pending",
      notes: draft.notes.trim(),
      submittedById: actor.id,
      submittedByName: actor.name,
      approvedById: null,
      approvedByName: null,
      createdAt: now,
      updatedAt: now,
    };
    this.data.variable.unshift(row);
    this.pushAudit({
      entityType: "variable",
      entityId: row.id,
      employeeId: emp.id,
      action: "variable_submitted",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: null,
      newValue: String(draft.amount),
      reason: draft.kind,
      note: draft.notes,
    });
    this.persist();
    return row;
  }

  decideVariable(
    id: string,
    decision: "approved" | "rejected",
    actor: CompActor,
    note = "",
  ) {
    if (!canApprove(actor)) throw new Error("Only HR admins can approve variable pay.");
    const row = this.data.variable.find((v) => v.id === id);
    if (!row) throw new Error("Variable pay not found.");
    if (row.status !== "pending" && row.status !== "draft") {
      throw new Error("This payout is no longer awaiting a decision.");
    }
    const now = nowIso();
    row.status = decision;
    row.approvedById = actor.id;
    row.approvedByName = actor.name;
    row.updatedAt = now;
    if (note) row.notes = [row.notes, note].filter(Boolean).join(" — ");
    this.pushAudit({
      entityType: "variable",
      entityId: row.id,
      employeeId: row.employeeId,
      action: decision === "approved" ? "variable_approved" : "rejected",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: "pending",
      newValue: decision,
      reason: row.kind,
      note,
    });
    this.persist();
    return row;
  }

  setManualAdjustment(
    employeeId: string,
    amount: number,
    note: string,
    actor: CompActor,
  ) {
    if (!canEditSensitive(actor)) throw new Error("Only HR admins can post payroll adjustments.");
    let adj = this.data.adjustments.find((a) => a.employeeId === employeeId);
    if (!adj) {
      adj = {
        employeeId,
        overtimeHours: 0,
        regularHours: 0,
        workedHours: 0,
        openShifts: 0,
        unpaidLeaveDays: 0,
        absenceDays: 0,
        attendancePenalty: 0,
        manualAdjustment: amount,
        manualNote: note,
      };
      this.data.adjustments.push(adj);
    } else {
      adj.manualAdjustment = amount;
      adj.manualNote = note;
    }
    this.pushAudit({
      entityType: "payroll",
      entityId: this.data.period.id,
      employeeId,
      action: "updated",
      actorId: actor.id,
      actorName: actor.name,
      oldValue: null,
      newValue: String(amount),
      reason: "manual_adjustment",
      note,
    });
    this.persist();
  }

  monthlyOf(employeeId: string) {
    const rec = this.record(employeeId);
    return rec ? toMonthlyEquivalent(rec) : 0;
  }

  bandOf(employeeId: string) {
    const emp = this.employee(employeeId);
    const rec = this.record(employeeId);
    if (!emp || !rec) return bandInsight(0, null);
    return bandInsight(
      toMonthlyEquivalent(rec),
      findBandFor(this.data.bands, rec.gradeId, emp.role),
    );
  }

  overtimeRate(employeeId: string) {
    const rec = this.record(employeeId);
    return rec ? overtimeHourlyRate(rec) : 0;
  }

  allowancesOf(employeeId: string) {
    const rec = this.record(employeeId);
    if (!rec) return 0;
    return recurringAllowances(
      this.components(employeeId),
      toMonthlyEquivalent(rec),
      this.data.period.end,
    );
  }

  recentChanges(actor: CompActor, asOf = todayIso()) {
    const ids = new Set(this.employees(actor).map((e) => e.id));
    return this.history().filter((h) => ids.has(h.employeeId) && isRecent(h.effectiveDate, asOf));
  }
}

let singleton: CompensationStore | null = null;

export function getCompensationStore(): CompensationStore {
  if (!singleton) singleton = new CompensationStore();
  return singleton;
}

export function resetCompensationStoreForTests(seed?: Snapshot) {
  singleton = new CompensationStore(seed ?? emptySnapshot());
  return singleton;
}

export { emptySnapshot };
