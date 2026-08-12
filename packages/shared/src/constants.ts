export const ROLES = ["super_admin", "tenant_admin", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const TENANT_STATUSES = ["active", "suspended", "deleted"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const KPI_TYPES = ["numeric", "qualitative"] as const;
export type KpiType = (typeof KPI_TYPES)[number];

export const REVIEW_PERIODS = ["weekly", "monthly", "quarterly"] as const;
export type ReviewPeriod = (typeof REVIEW_PERIODS)[number];

export const NOTIFICATION_TYPES = [
  "clock_in",
  "clock_out",
  "missed_clock_out",
  "kpi_due",
  "announcement",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const DEFAULT_PING_INTERVAL_SEC = 20;
export const MIN_PING_INTERVAL_SEC = 15;
export const MAX_PING_INTERVAL_SEC = 30;
export const DEFAULT_LOCATION_RETENTION_DAYS = 60;

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PAYMOB_INTERVAL_DAYS = [7, 15, 30, 60, 90, 180, 360] as const;

export const PLAN_CODES = ["trial", "starter", "pro", "enterprise"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];
