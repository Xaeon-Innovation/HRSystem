export const LEAVE_REQUEST_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "returned",
  "expired",
] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export const PARTIAL_DAY_TYPES = [
  "full",
  "first_half",
  "second_half",
  "custom_hours",
] as const;
export type PartialDayType = (typeof PARTIAL_DAY_TYPES)[number];

export const LEAVE_URGENCY = ["planned", "emergency"] as const;
export type LeaveUrgency = (typeof LEAVE_URGENCY)[number];

export const BALANCE_TXN_TYPES = [
  "ACCRUAL",
  "CARRY_OVER",
  "MANUAL_ADJUSTMENT",
  "DEDUCTION",
  "CANCELLATION_CREDIT",
  "EXPIRY",
  "POLICY_RESET",
  "PENDING_RESERVE",
  "PENDING_RELEASE",
] as const;
export type LeaveBalanceTxnType = (typeof BALANCE_TXN_TYPES)[number];

export const APPROVAL_STEP_STATUSES = [
  "waiting",
  "pending",
  "approved",
  "rejected",
  "skipped",
  "delegated",
] as const;
export type LeaveApprovalStepStatus = (typeof APPROVAL_STEP_STATUSES)[number];

export const APPROVER_ROLES = ["manager", "admin", "hr", "backup"] as const;
export type LeaveApproverRole = (typeof APPROVER_ROLES)[number];

export const CONFLICT_KINDS = [
  "insufficient_balance",
  "overlapping_approved",
  "duplicate_pending",
  "blackout",
  "min_notice",
  "probation",
  "team_overlap",
  "attachment_required",
  "invalid_range",
  "policy_ineligible",
] as const;
export type LeaveConflictKind = (typeof CONFLICT_KINDS)[number];

export const CONFLICT_SEVERITIES = ["error", "warning", "info"] as const;
export type LeaveConflictSeverity = (typeof CONFLICT_SEVERITIES)[number];

export const ACCRUAL_METHODS = [
  "monthly_fixed",
  "annual_divided",
  "tenure_tiered",
] as const;
export type LeaveAccrualMethod = (typeof ACCRUAL_METHODS)[number];

export const WEEKEND_RULES = ["none", "sat_sun", "fri_sat"] as const;
export type WeekendRule = (typeof WEEKEND_RULES)[number];

export const AUDIT_ACTIONS = [
  "created",
  "submitted",
  "validated",
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "expired",
  "commented",
  "attachment_added",
  "balance_adjusted",
  "delegated",
  "escalated",
  "reminder_sent",
] as const;
export type LeaveAuditAction = (typeof AUDIT_ACTIONS)[number];

export const LEAVE_NOTIFICATION_EVENTS = [
  "request_submitted",
  "request_approved",
  "request_rejected",
  "request_returned",
  "pending_reminder",
  "escalation_reminder",
  "cancellation_confirmation",
  "balance_updated",
] as const;
export type LeaveNotificationEvent = (typeof LEAVE_NOTIFICATION_EVENTS)[number];

export type LeaveEmployee = {
  id: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  role: string;
  department: string;
  branchId: string;
  branchName: string;
  managerId: string | null;
  managerName?: string | null;
  hireDate: string;
  probationEndsOn: string | null;
  status: "active" | "inactive";
};

export type LeaveHoliday = {
  date: string;
  name: string;
};

export type LeaveBlackout = {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
};

export type LeaveTenureTier = {
  minYears: number;
  monthlyDays: number;
};

export type LeaveAccrualSettings = {
  enabled: boolean;
  method: LeaveAccrualMethod;
  /** Used when method is monthly_fixed. Example: 2 days per month. */
  monthlyDays: number;
  /** Used when method is annual_divided: annualEntitlement / 12. */
  prorateNewHires: boolean;
  /** Calendar day of month to post accruals (1–28). */
  runDayOfMonth: number;
  tenureTiers: LeaveTenureTier[];
};

export type LeaveCarryOverSettings = {
  enabled: boolean;
  maxDays: number;
  expiryMonth: number;
  expiryDay: number;
};

export type LeavePolicyScope = {
  department?: string | null;
  branchId?: string | null;
  role?: string | null;
  minYearsOfService?: number | null;
  maxYearsOfService?: number | null;
};

export type LeaveType = {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  tracksBalance: boolean;
  approvalRequired: boolean;
  attachmentRequired: boolean;
  paid: boolean;
  /** When true, deductions hit the annual leave bucket instead of this type. */
  countsAgainstAnnual: boolean;
  allowHalfDay: boolean;
  allowEmergency: boolean;
  enabled: boolean;
  sortOrder: number;
};

export type LeavePolicy = {
  id: string;
  leaveTypeId: string;
  name: string;
  enabled: boolean;
  scope: LeavePolicyScope;
  annualEntitlement: number;
  accrual: LeaveAccrualSettings;
  carryOver: LeaveCarryOverSettings;
  negativeAllowed: boolean;
  probationLockoutDays: number;
  minNoticeDays: number;
  blackoutDates: LeaveBlackout[];
  weekendRule: WeekendRule;
  countHolidays: boolean;
  holidays: LeaveHoliday[];
  managerFirst: boolean;
  multiLevelEnabled: boolean;
  /** Requests at or above this many days use extra approval levels. */
  longLeaveDaysThreshold: number;
  reservePendingDays: boolean;
  /** Warn / block when this many people in the same department overlap. */
  staffingLimit: number;
  reminderHours: number;
  escalationHours: number;
  delegationEnabled: boolean;
  backupApproverId: string | null;
  backupApproverName: string | null;
};

export type LeaveBalance = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  openingBalance: number;
  accrued: number;
  carryOver: number;
  adjustments: number;
  used: number;
  pending: number;
  remaining: number;
  negativeAllowed: boolean;
  lastAccrualAt: string | null;
  updatedAt: string;
};

export type LeaveBalanceTransaction = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  type: LeaveBalanceTxnType;
  amount: number;
  requestId: string | null;
  source: string;
  note: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  balanceAfter: number;
};

export type LeaveApprovalStep = {
  id: string;
  requestId: string;
  level: number;
  role: LeaveApproverRole;
  assigneeId: string;
  assigneeName: string;
  backupId: string | null;
  backupName: string | null;
  status: LeaveApprovalStepStatus;
  actedAt: string | null;
  comment: string | null;
  delegatedToId: string | null;
  delegatedToName: string | null;
};

export type LeaveAuditEvent = {
  id: string;
  requestId: string | null;
  action: LeaveAuditAction;
  actorId: string;
  actorName: string;
  at: string;
  note: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type LeaveComment = {
  id: string;
  requestId: string;
  kind: "employee" | "approver" | "hr_internal" | "handover";
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type LeaveConflict = {
  kind: LeaveConflictKind;
  severity: LeaveConflictSeverity;
  message: string;
  relatedRequestId?: string;
  employeeIds?: string[];
};

export type LeaveAttachment = {
  id: string;
  name: string;
  mime: string;
  size: number;
  /** Base64 data URL for in-app download (capped at upload time). */
  dataUrl: string;
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branchId: string;
  branchName: string;
  managerId: string | null;
  managerName: string | null;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  partialDayType: PartialDayType;
  customHours: number | null;
  urgency: LeaveUrgency;
  status: LeaveRequestStatus;
  reason: string;
  /** @deprecated Prefer `attachments`; kept for older snapshots. */
  attachmentName: string | null;
  /** @deprecated Prefer `attachments[].dataUrl`; kept for older snapshots. */
  attachmentUrl: string | null;
  attachments: LeaveAttachment[];
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  decisionDate: string | null;
  rejectionReason: string | null;
  approverId: string | null;
  approverName: string | null;
  handoverNotes: string;
  coverageEmployeeId: string | null;
  coverageEmployeeName: string | null;
  internalHrNote: string;
  comments: LeaveComment[];
  approvalSteps: LeaveApprovalStep[];
  audit: LeaveAuditEvent[];
  conflicts: LeaveConflict[];
  createdAt: string;
  updatedAt: string;
};

export type LeaveCalendarEvent = {
  id: string;
  requestId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  branchName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  color: string;
  startDate: string;
  endDate: string;
  status: LeaveRequestStatus;
  requestedDays: number;
};

export type LeaveDepartmentUsage = {
  department: string;
  days: number;
  people: number;
};

export type LeaveReportSummary = {
  pendingCount: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  currentlyOff: number;
  upcomingAbsences: number;
  avgApprovalHours: number | null;
  mostUsedLeaveType: string | null;
  departmentUsage: LeaveDepartmentUsage[];
  balanceLiability: number;
  unusedLeaveTotal: number;
};

export type LeaveNotificationSetting = {
  event: LeaveNotificationEvent;
  label: string;
  description: string;
  employee: boolean;
  manager: boolean;
  admin: boolean;
};

export type LeaveRequestDraft = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestedDays: number | null;
  partialDayType: PartialDayType;
  customHours: number | null;
  urgency: LeaveUrgency;
  reason: string;
  handoverNotes: string;
  coverageEmployeeId: string | null;
  /** @deprecated Prefer `attachments`. */
  attachmentName: string | null;
  attachments?: LeaveAttachment[];
  asDraft: boolean;
};

export type LeaveRequestFilters = {
  search: string;
  status: LeaveRequestStatus | "";
  leaveTypeId: string;
  employeeId: string;
  department: string;
  branchId: string;
  managerId: string;
  from: string;
  to: string;
};

export type LeaveActor = {
  id: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  employeeId?: string | null;
  systemModuleRoles?: Array<"kpis" | "leaves" | "hiring" | "compensation"> | null;
};

export type LeaveDirectory = {
  employees: LeaveEmployee[];
  types: LeaveType[];
  policies: LeavePolicy[];
};

export type CountLeaveDaysInput = {
  startDate: string;
  endDate: string;
  partialDayType: PartialDayType;
  customHours?: number | null;
  weekendRule: WeekendRule;
  holidays: LeaveHoliday[];
  countHolidays: boolean;
};
