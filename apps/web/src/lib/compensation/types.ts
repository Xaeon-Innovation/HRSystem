export const PAY_STRUCTURES = [
  "monthly",
  "weekly",
  "daily",
  "hourly",
  "commission_only",
  "salary_plus_commission",
  "salary_plus_bonus",
  "hybrid",
] as const;
export type PayStructure = (typeof PAY_STRUCTURES)[number];

export const PAY_FREQUENCIES = ["monthly", "biweekly", "weekly", "daily"] as const;
export type PayFrequency = (typeof PAY_FREQUENCIES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const COMP_STATUSES = ["active", "pending_change", "frozen", "inactive"] as const;
export type CompStatus = (typeof COMP_STATUSES)[number];

export const COMPONENT_KINDS = [
  "base_salary",
  "housing_allowance",
  "transport_allowance",
  "meal_allowance",
  "mobile_allowance",
  "overtime",
  "bonus",
  "commission",
  "custom_earning",
  "advance_loan",
  "penalty",
  "absence",
  "unpaid_leave",
  "insurance_placeholder",
  "tax_placeholder",
  "custom_deduction",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

export const EARNING_KINDS: ComponentKind[] = [
  "base_salary",
  "housing_allowance",
  "transport_allowance",
  "meal_allowance",
  "mobile_allowance",
  "overtime",
  "bonus",
  "commission",
  "custom_earning",
];

export const DEDUCTION_KINDS: ComponentKind[] = [
  "advance_loan",
  "penalty",
  "absence",
  "unpaid_leave",
  "insurance_placeholder",
  "tax_placeholder",
  "custom_deduction",
];

export const CHANGE_TYPES = [
  "hire_salary",
  "promotion_increase",
  "merit_increase",
  "adjustment",
  "market_adjustment",
  "bonus_payout",
  "commission_payout",
  "temporary_allowance",
  "deduction_setup",
  "salary_freeze",
  "salary_reduction",
  "transfer_related",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const CHANGE_REQUEST_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "returned",
] as const;
export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export const VARIABLE_KINDS = ["bonus", "commission"] as const;
export type VariableKind = (typeof VARIABLE_KINDS)[number];

export const BONUS_TYPES = [
  "annual",
  "quarterly",
  "spot",
  "signing",
  "retention",
  "kpi_incentive",
] as const;
export type BonusType = (typeof BONUS_TYPES)[number];

export const VARIABLE_CYCLES = ["monthly", "quarterly", "annual", "one_off"] as const;
export type VariableCycle = (typeof VARIABLE_CYCLES)[number];

export const VARIABLE_STATUSES = ["draft", "pending", "approved", "paid", "rejected"] as const;
export type VariableStatus = (typeof VARIABLE_STATUSES)[number];

export const COMPONENT_STATUSES = ["active", "pending", "ended"] as const;
export type ComponentStatus = (typeof COMPONENT_STATUSES)[number];

export const BAND_POSITIONS = ["below", "in_band", "above"] as const;
export type BandPosition = (typeof BAND_POSITIONS)[number];

export const AUDIT_ACTIONS = [
  "created",
  "updated",
  "submitted",
  "approved",
  "rejected",
  "returned",
  "frozen",
  "unfrozen",
  "component_added",
  "component_ended",
  "variable_submitted",
  "variable_approved",
  "commented",
] as const;
export type CompAuditAction = (typeof AUDIT_ACTIONS)[number];

export const APPRAISAL_RESULTS = ["exceeds", "meets", "developing", "below"] as const;
export type AppraisalResult = (typeof APPRAISAL_RESULTS)[number];

export type CompActor = {
  id: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  employeeId?: string | null;
  systemModuleRoles?: Array<"kpis" | "leaves" | "hiring" | "compensation" | "tasks"> | null;
};

export type CompEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  email?: string | null;
  role: string;
  department: string;
  branchId: string;
  branchName: string;
  managerId: string | null;
  managerName: string | null;
  hireDate: string;
  employmentType: EmploymentType;
  status: "active" | "inactive";
  latestKpiScore: number | null;
  lastAppraisalResult: AppraisalResult | null;
  lastAppraisalDate: string | null;
};

export type SalaryBand = {
  id: string;
  grade: string;
  role: string;
  department: string | null;
  min: number;
  midpoint: number;
  max: number;
  currency: string;
};

export type CompensationRecord = {
  id: string;
  employeeId: string;
  payStructure: PayStructure;
  baseAmount: number;
  currency: string;
  payFrequency: PayFrequency;
  hoursPerWeek: number;
  workingDaysPerMonth: number;
  effectiveDate: string;
  status: CompStatus;
  gradeId: string | null;
  notes: string;
  updatedAt: string;
};

export type CompComponent = {
  id: string;
  employeeId: string;
  kind: ComponentKind;
  label: string;
  amount: number;
  amountType: "fixed" | "percent_of_base";
  recurring: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: ComponentStatus;
  note: string;
};

export type SalaryHistoryEntry = {
  id: string;
  employeeId: string;
  changeType: ChangeType;
  previousAmount: number;
  newAmount: number;
  changeAmount: number;
  changePercent: number | null;
  effectiveDate: string;
  reasonCode: ChangeType;
  reason: string;
  reviewCycleId: string | null;
  reviewCycleName: string | null;
  submittedById: string;
  submittedByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CompComment = {
  id: string;
  requestId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CompAuditEvent = {
  id: string;
  entityType: "record" | "request" | "component" | "variable" | "payroll";
  entityId: string;
  employeeId: string | null;
  action: CompAuditAction;
  actorId: string;
  actorName: string;
  at: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  note: string;
};

export type ChangeRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branchName: string;
  changeType: ChangeType;
  previousAmount: number;
  newAmount: number;
  currency: string;
  effectiveDate: string;
  reason: string;
  justification: string;
  reviewCycleId: string | null;
  reviewCycleName: string | null;
  kpiScore: number | null;
  componentKind: ComponentKind | null;
  status: ChangeRequestStatus;
  submittedById: string;
  submittedByName: string;
  submittedAt: string | null;
  decidedById: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  comments: CompComment[];
  audit: CompAuditEvent[];
  createdAt: string;
  updatedAt: string;
};

export type VariablePay = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  kind: VariableKind;
  bonusType: BonusType | null;
  amount: number;
  currency: string;
  cycle: VariableCycle;
  commissionFormula: string | null;
  kpiLinked: boolean;
  kpiScore: number | null;
  payoutPeriodStart: string;
  payoutPeriodEnd: string;
  status: VariableStatus;
  notes: string;
  submittedById: string;
  submittedByName: string;
  approvedById: string | null;
  approvedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PayrollPeriod = {
  id: string;
  label: string;
  start: string;
  end: string;
  cutoff: string;
  cycle: "monthly";
};

export type PeriodAdjustment = {
  employeeId: string;
  overtimeHours: number;
  regularHours: number;
  workedHours: number;
  openShifts: number;
  unpaidLeaveDays: number;
  absenceDays: number;
  attendancePenalty: number;
  manualAdjustment: number;
  manualNote: string;
};

export type PayslipBreakdown = {
  currency: string;
  base: number;
  allowances: number;
  incentives: number;
  overtime: number;
  gross: number;
  deductions: number;
  net: number;
  lines: PayslipLine[];
  regularHours: number | null;
  overtimeHours: number | null;
  workedHours: number | null;
  hourlyRate: number | null;
};

export type PayslipLine = {
  kind: ComponentKind | "manual_adjustment";
  label: string;
  side: "earning" | "deduction";
  amount: number;
};

export type PayrollInputRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  branchName: string;
  currency: string;
  payStructure: PayStructure;
  hourlyRate: number | null;
  workedHours: number;
  regularHours: number;
  overtimeHoursWorked: number;
  openShifts: number;
  baseSalary: number;
  allowances: number;
  overtime: number;
  incentives: number;
  unpaidLeaveDeduction: number;
  absenceDeduction: number;
  attendanceImpact: number;
  otherDeductions: number;
  manualAdjustments: number;
  gross: number;
  totalDeductions: number;
  net: number;
  leaveImpactNote: string;
  breakdown: PayslipBreakdown;
};

export type BandInsight = {
  band: SalaryBand | null;
  monthly: number;
  position: BandPosition | null;
  compaRatio: number | null;
  percentThroughBand: number | null;
};

export type CompProfile = {
  employee: CompEmployee;
  record: CompensationRecord;
  components: CompComponent[];
  history: SalaryHistoryEntry[];
  variable: VariablePay[];
  band: BandInsight;
  monthlyEquivalent: number;
  totalCompensation: number;
  payslip: PayslipBreakdown;
  hours: WorkedHours | null;
};

export type OverviewSummary = {
  monthlyLiability: number;
  bonusesThisCycle: number;
  commissionsThisCycle: number;
  pendingApprovals: number;
  recentChangeCount: number;
  outOfBandCount: number;
  upcomingCutoff: string;
  daysToCutoff: number;
  deductionsThisCycle: number;
  currency: string;
  employeeCount: number;
  avgByDepartment: { department: string; average: number; headcount: number }[];
  avgByRole: { role: string; average: number; headcount: number }[];
};

export type CompReport = {
  byDepartment: { label: string; amount: number; people: number }[];
  byRole: { label: string; amount: number; people: number }[];
  byBranch: { label: string; average: number; people: number }[];
  growth: { month: string; amount: number }[];
  outOfBand: { employeeId: string; name: string; role: string; monthly: number; position: BandPosition }[];
  pendingApprovals: number;
  totalBonuses: number;
  totalCommissions: number;
  recentChanges: SalaryHistoryEntry[];
  costByTeam: { label: string; amount: number }[];
};

export type EmployeeFilters = {
  search: string;
  department: string;
  branchId: string;
  payStructure: PayStructure | "";
  status: CompStatus | "";
  band: "all" | "below" | "in_band" | "above";
};

export type ChangeRequestDraft = {
  employeeId: string;
  changeType: ChangeType;
  newAmount: number;
  effectiveDate: string;
  reason: string;
  justification: string;
  reviewCycleId: string | null;
  reviewCycleName: string | null;
  componentKind: ComponentKind | null;
  asDraft: boolean;
};

export type VariablePayDraft = {
  employeeId: string;
  kind: VariableKind;
  bonusType: BonusType | null;
  amount: number;
  cycle: VariableCycle;
  commissionFormula: string | null;
  kpiLinked: boolean;
  payoutPeriodStart: string;
  payoutPeriodEnd: string;
  notes: string;
};

export type ClockShift = {
  id?: string;
  employeeId: string;
  clockInAt: string;
  clockOutAt: string | null;
};

export type ShiftHoursRow = {
  clockInAt: string;
  clockOutAt: string | null;
  hours: number;
  open: boolean;
};

export type WorkedHours = {
  employeeId: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  openShiftCount: number;
  shiftCount: number;
  shifts: ShiftHoursRow[];
};

export type PaySetupDraft = {
  employeeId: string;
  payStructure: PayStructure;
  baseAmount: number;
  hoursPerWeek: number;
  notes?: string;
};

export type ComponentDraft = {
  employeeId: string;
  kind: ComponentKind;
  label: string;
  amount: number;
  amountType: "fixed" | "percent_of_base";
  recurring: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string;
};
