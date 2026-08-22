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

export const BRANCH_STATUSES = ["active", "inactive"] as const;
export type BranchStatus = (typeof BRANCH_STATUSES)[number];

export const INTEGRATION_PROVIDER_TYPES = [
  "custom_api",
  "webhook",
  "csv",
  "crm",
  "cms",
  "erp",
] as const;
export type IntegrationProviderType =
  (typeof INTEGRATION_PROVIDER_TYPES)[number];

export const INTEGRATION_CONNECTION_STATUSES = [
  "draft",
  "active",
  "paused",
  "error",
] as const;
export type IntegrationConnectionStatus =
  (typeof INTEGRATION_CONNECTION_STATUSES)[number];

export const INTEGRATION_AUTH_TYPES = [
  "api_key",
  "bearer",
  "oauth2",
  "basic",
  "none",
] as const;
export type IntegrationAuthType = (typeof INTEGRATION_AUTH_TYPES)[number];

export const INTEGRATION_SYNC_MODES = [
  "webhook",
  "polling",
  "manual",
  "hybrid",
] as const;
export type IntegrationSyncMode = (typeof INTEGRATION_SYNC_MODES)[number];

export const INTEGRATION_SYNC_TRIGGERS = [
  "schedule",
  "webhook",
  "manual",
  "replay",
  "csv",
] as const;
export type IntegrationSyncTrigger = (typeof INTEGRATION_SYNC_TRIGGERS)[number];

export const INTEGRATION_SYNC_RUN_STATUSES = [
  "running",
  "success",
  "partial",
  "failed",
] as const;
export type IntegrationSyncRunStatus =
  (typeof INTEGRATION_SYNC_RUN_STATUSES)[number];

export const INTEGRATION_PROCESSING_STATUSES = [
  "pending",
  "processed",
  "failed",
  "dead_letter",
] as const;
export type IntegrationProcessingStatus =
  (typeof INTEGRATION_PROCESSING_STATUSES)[number];

export const IDENTITY_MATCH_METHODS = [
  "direct_id",
  "email",
  "phone",
  "manual",
] as const;
export type IdentityMatchMethod = (typeof IDENTITY_MATCH_METHODS)[number];

export const FIELD_TRANSFORM_TYPES = [
  "direct",
  "enum_map",
  "date_parse",
  "number_parse",
  "custom",
] as const;
export type FieldTransformType = (typeof FIELD_TRANSFORM_TYPES)[number];

export const CANONICAL_TARGET_ENTITIES = [
  "canonical_job_event",
  "canonical_visit_event",
  "canonical_task_event",
  "canonical_sales_event",
  "canonical_customer",
  "canonical_project",
] as const;
export type CanonicalTargetEntity = (typeof CANONICAL_TARGET_ENTITIES)[number];

export const CANONICAL_FIELD_MAP: Record<CanonicalTargetEntity, string[]> = {
  canonical_job_event: [
    "external_record_id",
    "employee_external_key",
    "employee_email",
    "employee_phone",
    "branch_external_key",
    "customer_external_key",
    "project_external_key",
    "event_type",
    "status",
    "title",
    "category",
    "occurred_at",
    "scheduled_at",
    "completed_at",
    "duration_minutes",
    "value_amount",
    "currency",
  ],
  canonical_visit_event: [
    "external_record_id",
    "employee_external_key",
    "employee_email",
    "employee_phone",
    "branch_external_key",
    "customer_external_key",
    "check_in_at",
    "check_out_at",
    "visit_duration_minutes",
    "visit_status",
    "revenue_amount",
  ],
  canonical_task_event: [
    "external_record_id",
    "employee_external_key",
    "employee_email",
    "employee_phone",
    "assigned_at",
    "completed_at",
    "due_at",
    "task_type",
    "priority",
    "status",
    "points",
  ],
  canonical_sales_event: [
    "external_record_id",
    "employee_external_key",
    "employee_email",
    "employee_phone",
    "branch_external_key",
    "customer_external_key",
    "event_date",
    "amount",
    "currency",
    "status",
  ],
  canonical_customer: ["external_record_id", "name"],
  canonical_project: [
    "external_record_id",
    "customer_external_key",
    "name",
    "status",
  ],
};

export const ANALYTICS_ALERT_TYPES = [
  "attendance_drop",
  "off_route",
  "low_productivity",
  "sync_failure",
  "reconciliation_drift",
  "stale_sync",
] as const;
export type AnalyticsAlertType = (typeof ANALYTICS_ALERT_TYPES)[number];

export const ANALYTICS_ALERT_SEVERITIES = ["low", "medium", "high"] as const;
export type AnalyticsAlertSeverity = (typeof ANALYTICS_ALERT_SEVERITIES)[number];

export const ANALYTICS_ALERT_STATUSES = [
  "open",
  "acknowledged",
  "resolved",
] as const;
export type AnalyticsAlertStatus = (typeof ANALYTICS_ALERT_STATUSES)[number];

export const ANALYTICS_ENTITY_TYPES = [
  "employee",
  "branch",
  "connection",
  "tenant",
] as const;
export type AnalyticsEntityType = (typeof ANALYTICS_ENTITY_TYPES)[number];

export const METRIC_FORMULA_TYPES = [
  "sql",
  "expression",
  "weighted_score",
] as const;
export type MetricFormulaType = (typeof METRIC_FORMULA_TYPES)[number];

export const METRIC_AGGREGATION_LEVELS = [
  "employee",
  "branch",
  "tenant",
] as const;
export type MetricAggregationLevel = (typeof METRIC_AGGREGATION_LEVELS)[number];

export const METRIC_TIME_GRAINS = ["day", "week", "month"] as const;
export type MetricTimeGrain = (typeof METRIC_TIME_GRAINS)[number];

export const DEFAULT_HOURLY_COST = 0;
export const DEFAULT_INTEGRATION_RAW_RETENTION_DAYS = 60;
export const MIN_INTEGRATION_RAW_RETENTION_DAYS = 30;
export const MAX_INTEGRATION_RAW_RETENTION_DAYS = 90;
export const DEFAULT_LATENESS_GRACE_MINUTES = 15;
export const DEFAULT_SHIFT_START_HOUR = 9;

export const PLAN_FEATURE_KEYS = ["integrations", "analytics"] as const;
export type PlanFeatureKey = (typeof PLAN_FEATURE_KEYS)[number];
