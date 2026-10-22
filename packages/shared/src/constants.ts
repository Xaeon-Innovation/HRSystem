export const ROLES = ["super_admin", "tenant_admin", "employee"] as const;
export type Role = (typeof ROLES)[number];

/** Module control roles an admin can grant to employees (distinct from access `Role` and job roles). */
export const SYSTEM_MODULE_ROLES = [
  "kpis",
  "leaves",
  "hiring",
  "compensation",
  "tasks",
] as const;
export type SystemModuleRole = (typeof SYSTEM_MODULE_ROLES)[number];

export const SYSTEM_MODULE_ROLE_LABELS: Record<SystemModuleRole, string> = {
  kpis: "KPIs",
  leaves: "Leaves",
  hiring: "Hiring",
  compensation: "Compensation",
  tasks: "Tasks",
};

export function normalizeSystemModuleRoles(
  roles: readonly string[] | null | undefined,
): SystemModuleRole[] {
  if (!roles?.length) return [];
  const allowed = new Set<string>(SYSTEM_MODULE_ROLES);
  const unique = new Set<SystemModuleRole>();
  for (const role of roles) {
    if (allowed.has(role)) unique.add(role as SystemModuleRole);
  }
  return SYSTEM_MODULE_ROLES.filter((role) => unique.has(role));
}

export function hasSystemModuleRole(
  actor: {
    role?: Role | string | null;
    systemModuleRoles?: readonly string[] | null;
  } | null | undefined,
  module: SystemModuleRole,
): boolean {
  if (!actor) return false;
  if (actor.role === "tenant_admin" || actor.role === "super_admin") return true;
  return normalizeSystemModuleRoles(actor.systemModuleRoles).includes(module);
}

export const TENANT_STATUSES = ["active", "suspended", "deleted"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const EMPLOYEE_STATUSES = ["active", "inactive"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const PRESENCE_MODES = ["fixed_zone", "mobile"] as const;
export type PresenceMode = (typeof PRESENCE_MODES)[number];

export const EMPLOYEE_DOCUMENT_TYPES = [
  "passport",
  "residency",
  "driving_license",
  "contract",
  "other",
] as const;
export type EmployeeDocumentType = (typeof EMPLOYEE_DOCUMENT_TYPES)[number];

export const SKILL_LEVELS = ["basic", "competent", "strong"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_RANK: Record<SkillLevel, number> = {
  basic: 1,
  competent: 2,
  strong: 3,
};

export const TRAINING_REASONS = ["gap", "strengthen"] as const;
export type TrainingReason = (typeof TRAINING_REASONS)[number];

export const TRAINING_STATUSES = [
  "proposed",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const ASSESSMENT_PERIODS = ["weekly", "monthly"] as const;
export type AssessmentPeriod = (typeof ASSESSMENT_PERIODS)[number];

export const PERFORMANCE_REPORT_CADENCES = [
  "daily",
  "weekly",
  "monthly",
] as const;
export type PerformanceReportCadence =
  (typeof PERFORMANCE_REPORT_CADENCES)[number];

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
  "alert",
  "overtime_prompt",
  "late_clock_in",
  "late_clock_out",
  "left_zone_exit",
  "break_overstay",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SHIFT_CADENCES = ["daily", "weekly", "monthly"] as const;
export type ShiftCadence = (typeof SHIFT_CADENCES)[number];

export const SHIFT_INSTANCE_STATUSES = ["scheduled", "cancelled"] as const;
export type ShiftInstanceStatus = (typeof SHIFT_INSTANCE_STATUSES)[number];

export const SHIFT_OVERTIME_STATUSES = [
  "none",
  "prompted",
  "approved",
  "declined",
  "late_unanswered",
] as const;
export type ShiftOvertimeStatus = (typeof SHIFT_OVERTIME_STATUSES)[number];

export const BREAK_PERIOD_MODES = ["fixed", "flexible"] as const;
export type BreakPeriodMode = (typeof BREAK_PERIOD_MODES)[number];

export const BREAK_SESSION_STATUSES = [
  "scheduled",
  "active",
  "ended",
  "overstayed",
  "cancelled",
] as const;
export type BreakSessionStatus = (typeof BREAK_SESSION_STATUSES)[number];

export const LEFT_ZONE_RESOLUTIONS = [
  "require_admin",
  "auto_approve_emergency",
  "auto_day_deduction",
] as const;
export type LeftZoneResolution = (typeof LEFT_ZONE_RESOLUTIONS)[number];

export const LEFT_ZONE_INCIDENT_RESOLUTIONS = [
  "approved_emergency",
  "day_deduction",
] as const;
export type LeftZoneIncidentResolution =
  (typeof LEFT_ZONE_INCIDENT_RESOLUTIONS)[number];

export const LEFT_ZONE_PHASES = [
  "mid_shift",
  "end_grace",
  "overtime",
  "break_overstay",
] as const;
export type LeftZonePhase = (typeof LEFT_ZONE_PHASES)[number];

export const SHIFT_MATERIALIZE_HORIZON_DAYS = 45;

export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "open",
  "in_progress",
  "submitted",
  "changes_requested",
  "completed",
  "cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_ASSIGNMENT_MODES = ["shared", "individual"] as const;
export type TaskAssignmentMode = (typeof TASK_ASSIGNMENT_MODES)[number];

export const TASK_ATTACHMENT_KINDS = ["link", "file"] as const;
export type TaskAttachmentKind = (typeof TASK_ATTACHMENT_KINDS)[number];

export const TASK_DELIVERABLE_TYPES = [
  "report",
  "docs",
  "screenshots",
  "other",
] as const;
export type TaskDeliverableType = (typeof TASK_DELIVERABLE_TYPES)[number];

export const TASK_ACTIVITY_KINDS = [
  "created",
  "started",
  "attached",
  "deliverable_submitted",
  "completed",
  "submitted",
  "reviewed",
  "send_back",
  "cancelled",
] as const;
export type TaskActivityKind = (typeof TASK_ACTIVITY_KINDS)[number];

export const DEFAULT_PING_INTERVAL_SEC = 20;
export const MIN_PING_INTERVAL_SEC = 15;
/** Upper bound for tenant ping settings (Field plan uses 60s). */
export const MAX_PING_INTERVAL_SEC = 60;
export const DEFAULT_LOCATION_RETENTION_DAYS = 60;

export const MIN_GEOFENCE_RADIUS_METERS = 50;
export const MAX_GEOFENCE_RADIUS_METERS = 50_000;
export const DEFAULT_GEOFENCE_RADIUS_METERS = 500;

export const MAP_TILE_STYLES = [
  "voyager",
  "positron",
  "osm",
  "dark",
] as const;
export type MapTileStyle = (typeof MAP_TILE_STYLES)[number];

export const MAP_MARKER_STYLES = ["pulse", "soft", "pin"] as const;
export type MapMarkerStyle = (typeof MAP_MARKER_STYLES)[number];

export const MAP_THEME_IDS = [
  "teal",
  "ocean",
  "forest",
  "sunset",
  "midnight",
  "minimal",
  "coral",
  "slate",
  "custom",
] as const;
export type MapThemeId = (typeof MAP_THEME_IDS)[number];

export type MapAppearance = {
  themeId: MapThemeId;
  tileStyle: MapTileStyle;
  markerStyle: MapMarkerStyle;
  onShiftColor: string;
  lastSeenColor: string;
  trailColor: string;
  showInitials: boolean;
};

export type MapTheme = {
  id: Exclude<MapThemeId, "custom">;
  name: string;
  description: string;
  appearance: Omit<MapAppearance, "themeId"> & { themeId: Exclude<MapThemeId, "custom"> };
};

export const MAP_THEMES: MapTheme[] = [
  {
    id: "teal",
    name: "Teal Field",
    description: "Colorful map with teal on-shift markers",
    appearance: {
      themeId: "teal",
      tileStyle: "voyager",
      markerStyle: "pulse",
      onShiftColor: "#0d9488",
      lastSeenColor: "#94a3b8",
      trailColor: "#0f766e",
      showInitials: true,
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Bright blues on a soft light basemap",
    appearance: {
      themeId: "ocean",
      tileStyle: "positron",
      markerStyle: "pulse",
      onShiftColor: "#0284c7",
      lastSeenColor: "#94a3b8",
      trailColor: "#0369a1",
      showInitials: true,
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep greens with soft blob markers",
    appearance: {
      themeId: "forest",
      tileStyle: "voyager",
      markerStyle: "soft",
      onShiftColor: "#15803d",
      lastSeenColor: "#a3a3a3",
      trailColor: "#166534",
      showInitials: true,
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm coral accents on a colorful map",
    appearance: {
      themeId: "sunset",
      tileStyle: "voyager",
      markerStyle: "pin",
      onShiftColor: "#ea580c",
      lastSeenColor: "#a8a29e",
      trailColor: "#c2410c",
      showInitials: true,
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark basemap with bright aqua pins",
    appearance: {
      themeId: "midnight",
      tileStyle: "dark",
      markerStyle: "pulse",
      onShiftColor: "#22d3ee",
      lastSeenColor: "#64748b",
      trailColor: "#06b6d4",
      showInitials: true,
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean light map with subtle markers",
    appearance: {
      themeId: "minimal",
      tileStyle: "positron",
      markerStyle: "soft",
      onShiftColor: "#475569",
      lastSeenColor: "#cbd5e1",
      trailColor: "#334155",
      showInitials: true,
    },
  },
  {
    id: "coral",
    name: "Coral",
    description: "Friendly pinks on classic OSM tiles",
    appearance: {
      themeId: "coral",
      tileStyle: "osm",
      markerStyle: "soft",
      onShiftColor: "#e11d48",
      lastSeenColor: "#a1a1aa",
      trailColor: "#be123c",
      showInitials: true,
    },
  },
  {
    id: "slate",
    name: "Slate Pro",
    description: "Professional navy pins on a light map",
    appearance: {
      themeId: "slate",
      tileStyle: "positron",
      markerStyle: "pin",
      onShiftColor: "#1e40af",
      lastSeenColor: "#94a3b8",
      trailColor: "#1e3a8a",
      showInitials: true,
    },
  },
];

export const DEFAULT_MAP_APPEARANCE: MapAppearance =
  MAP_THEMES.find((t) => t.id === "teal")!.appearance;

export function getMapTheme(id: string | undefined | null): MapTheme | undefined {
  if (!id || id === "custom") return undefined;
  return MAP_THEMES.find((t) => t.id === id);
}

export function resolveMapAppearance(
  partial?: Partial<MapAppearance> | null,
): MapAppearance {
  const incoming = partial ?? {};
  const themeId = incoming.themeId ?? "teal";
  const theme = getMapTheme(themeId);
  if (theme) {
    return { ...theme.appearance, ...incoming, themeId: theme.id };
  }
  return { ...DEFAULT_MAP_APPEARANCE, ...incoming, themeId: "custom" };
}

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const LEAD_SOURCES = [
  "demo",
  "signup_trial",
  "signup_paid",
  "enterprise",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const PAYMOB_INTERVAL_DAYS = [7, 15, 30, 60, 90, 180, 360] as const;

export const PLAN_CODES = [
  "trial",
  "field",
  "people",
  "ops",
  "scale",
  "enterprise",
  "starter",
  "pro",
] as const;
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

/** Boolean module gates — see packages/shared/src/modules.ts (MODULE_KEYS). */
/** Numeric / meta keys stored alongside boolean feature flags on `plans.features`. */
export const PLAN_LIMIT_KEYS = [
  "pingIntervalSec",
  "locationRetentionDays",
  "trialDays",
] as const;
export type PlanLimitKey = (typeof PLAN_LIMIT_KEYS)[number];
