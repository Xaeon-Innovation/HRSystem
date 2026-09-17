import {
  type AnyPgColumn,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "super_admin",
  "tenant_admin",
  "employee",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "suspended",
  "deleted",
]);

export const employeeStatusEnum = pgEnum("employee_status", [
  "active",
  "inactive",
]);

export const kpiTypeEnum = pgEnum("kpi_type", ["numeric", "qualitative"]);

export const reviewPeriodEnum = pgEnum("review_period", [
  "weekly",
  "monthly",
  "quarterly",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
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
]);

export const shiftCadenceEnum = pgEnum("shift_cadence", [
  "daily",
  "weekly",
  "monthly",
]);

export const shiftInstanceStatusEnum = pgEnum("shift_instance_status", [
  "scheduled",
  "cancelled",
]);

export const shiftOvertimeStatusEnum = pgEnum("shift_overtime_status", [
  "none",
  "prompted",
  "approved",
  "declined",
  "late_unanswered",
]);

export const breakPeriodModeEnum = pgEnum("break_period_mode", [
  "fixed",
  "flexible",
]);

export const breakSessionStatusEnum = pgEnum("break_session_status", [
  "scheduled",
  "active",
  "ended",
  "overstayed",
  "cancelled",
]);

export const breakSessionSourceEnum = pgEnum("break_session_source", [
  "fixed_window",
  "employee_request",
  "admin_assigned",
]);

export const leftZonePhaseEnum = pgEnum("left_zone_phase", [
  "mid_shift",
  "end_grace",
  "overtime",
  "break_overstay",
]);

export const leftZoneIncidentStatusEnum = pgEnum("left_zone_incident_status", [
  "pending",
  "approved_emergency",
  "day_deduction",
]);

export const alertCategoryEnum = pgEnum("alert_category", [
  "employee",
  "leave",
  "kpi",
  "attendance",
  "payroll",
  "system",
  "custom",
]);

export const alertUrgencyEnum = pgEnum("alert_urgency", [
  "info",
  "warning",
  "critical",
]);

export const alertFrequencyEnum = pgEnum("alert_frequency", [
  "instant",
  "daily_digest",
  "weekly_digest",
]);

export const alertRuleKindEnum = pgEnum("alert_rule_kind", [
  "catalog",
  "custom",
]);

export const alertSourceEnum = pgEnum("alert_source", [
  "leave",
  "attendance",
  "kpi",
  "employee",
  "payroll",
  "documents",
  "location",
]);

export const alertConditionEnum = pgEnum("alert_condition", [
  "above",
  "below",
  "equal",
  "missing",
  "overdue",
  "unchanged_days",
  "trend_drop",
]);

export const alertMetricEnum = pgEnum("alert_metric", [
  "leave_balance",
  "lateness_count",
  "kpi_score",
  "absences",
  "expiring_document_days",
  "pending_approvals",
  "location_inactivity",
]);

export const alertScopeEnum = pgEnum("alert_scope", [
  "company",
  "branch",
  "department",
  "role",
  "employee",
]);

export const alertDurationUnitEnum = pgEnum("alert_duration_unit", [
  "hours",
  "days",
  "months",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "demo",
  "signup_trial",
  "signup_paid",
  "enterprise",
]);

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "closed",
]);

export const branchStatusEnum = pgEnum("branch_status", ["active", "inactive"]);

export const integrationProviderEnum = pgEnum("integration_provider_type", [
  "custom_api",
  "webhook",
  "csv",
  "crm",
  "cms",
  "erp",
]);

export const integrationStatusEnum = pgEnum("integration_connection_status", [
  "draft",
  "active",
  "paused",
  "error",
]);

export const integrationAuthTypeEnum = pgEnum("integration_auth_type", [
  "api_key",
  "bearer",
  "oauth2",
  "basic",
  "none",
]);

export const integrationSyncModeEnum = pgEnum("integration_sync_mode", [
  "webhook",
  "polling",
  "manual",
  "hybrid",
]);

export const integrationSyncTriggerEnum = pgEnum("integration_sync_trigger", [
  "schedule",
  "webhook",
  "manual",
  "replay",
  "csv",
]);

export const integrationSyncRunStatusEnum = pgEnum(
  "integration_sync_run_status",
  ["running", "success", "partial", "failed"],
);

export const integrationProcessingStatusEnum = pgEnum(
  "integration_processing_status",
  ["pending", "processed", "failed", "dead_letter"],
);

export const identityMatchMethodEnum = pgEnum("identity_match_method", [
  "direct_id",
  "email",
  "phone",
  "manual",
]);

export const fieldTransformTypeEnum = pgEnum("field_transform_type", [
  "direct",
  "enum_map",
  "date_parse",
  "number_parse",
  "custom",
]);

export const analyticsAlertTypeEnum = pgEnum("analytics_alert_type", [
  "attendance_drop",
  "off_route",
  "low_productivity",
  "sync_failure",
  "reconciliation_drift",
  "stale_sync",
]);

export const analyticsAlertSeverityEnum = pgEnum("analytics_alert_severity", [
  "low",
  "medium",
  "high",
]);

export const analyticsAlertStatusEnum = pgEnum("analytics_alert_status", [
  "open",
  "acknowledged",
  "resolved",
]);

export const analyticsEntityTypeEnum = pgEnum("analytics_entity_type", [
  "employee",
  "branch",
  "connection",
  "tenant",
]);

export const metricFormulaTypeEnum = pgEnum("metric_formula_type", [
  "sql",
  "expression",
  "weighted_score",
]);

export const metricAggregationLevelEnum = pgEnum("metric_aggregation_level", [
  "employee",
  "branch",
  "tenant",
]);

export const metricTimeGrainEnum = pgEnum("metric_time_grain", [
  "day",
  "week",
  "month",
]);

export type MapAppearanceSettings = {
  themeId?:
    | "teal"
    | "ocean"
    | "forest"
    | "sunset"
    | "midnight"
    | "minimal"
    | "coral"
    | "slate"
    | "custom";
  tileStyle?: "voyager" | "positron" | "osm" | "dark";
  markerStyle?: "pulse" | "soft" | "pin";
  onShiftColor?: string;
  lastSeenColor?: string;
  trailColor?: string;
  showInitials?: boolean;
};

export type TenantSettings = {
  brandingName?: string;
  logoUrl?: string | null;
  brandPreset?: "neutral" | "teal" | "forest" | "slate";
  timezone?: string;
  pingIntervalSec?: number;
  locationRetentionDays?: number;
  missedClockOutHours?: number;
  defaultHourlyCost?: number;
  integrationRawRetentionDays?: number;
  latenessGraceMinutes?: number;
  shiftStartHour?: number;
  /** When true, leaving geofence while clocked in (and not on break) auto clock-outs. */
  leftZoneAutoClockOut?: boolean;
  /** How left-zone incidents are resolved by default. */
  leftZoneResolution?:
    | "require_admin"
    | "auto_approve_emergency"
    | "auto_day_deduction";
  map?: MapAppearanceSettings;
  /** Platform-owned Lab tenant used for plan previews. */
  platformLab?: boolean;
  /** Per-tenant boolean overrides for MODULE_KEYS (true/false). Absent = inherit plan. */
  featureOverrides?: Partial<
    Record<
      | "liveMap"
      | "teamToday"
      | "leave"
      | "hiring"
      | "kpis"
      | "compensation"
      | "integrations"
      | "analytics"
      | "fieldOps"
      | "peopleOps",
      boolean
    >
  >;
};

export type IntegrationConnectorConfig = {
  entities?: Array<{
    sourceEntity: string;
    path: string;
    method?: string;
    itemsPath?: string;
    idField?: string;
    updatedAtField?: string;
    eventType?: string;
  }>;
  pagination?: {
    type: "none" | "page" | "cursor";
    pageParam?: string;
    cursorParam?: string;
    cursorPath?: string;
  };
  hmacHeader?: string;
  hmacPayloadPath?: string;
  /** Built-in connector pack, e.g. creative_cms_goals */
  preset?: string;
  /** When "cms_jwt" or "oauth2", platform refreshes tokens automatically */
  authStrategy?: string;
};

export type IntegrationAuthConfig = {
  apiKey?: string;
  apiKeyHeader?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  headerName?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
};

export type FieldTransformConfig = {
  enumMap?: Record<string, string>;
  dateFormat?: string;
  customExpression?: string;
};

export type MetricFormulaConfig = {
  expression?: string;
  weights?: Record<string, number>;
  sql?: string;
};

export type PlanFeatures = Record<string, boolean | number | string>;

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: tenantStatusEnum("status").notNull().default("active"),
    settings: jsonb("settings").$type<TenantSettings>().notNull().default({}),
    logoMime: text("logo_mime"),
    logoBytes: text("logo_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("tenants_slug_uidx").on(t.slug)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    role: roleEnum("role").notNull(),
    /** Module control grants (kpis, leaves, hiring, compensation). Empty for regular employees. */
    systemModuleRoles: jsonb("system_module_roles")
      .$type<string[]>()
      .notNull()
      .default([]),
    avatarMime: text("avatar_mime"),
    avatarBytes: text("avatar_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_tenant_email_uidx").on(t.tenantId, t.email),
    index("users_tenant_idx").on(t.tenantId),
  ],
);

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    status: branchStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("branches_tenant_code_uidx").on(t.tenantId, t.code),
    index("branches_tenant_idx").on(t.tenantId),
  ],
);

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("sites_tenant_code_uidx").on(t.tenantId, t.code),
    index("sites_tenant_branch_idx").on(t.tenantId, t.branchId),
  ],
);

export const employees = pgTable(
  "employees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    /** Direct manager (same tenant). Null = unassigned. */
    managerId: uuid("manager_id").references((): AnyPgColumn => employees.id, {
      onDelete: "set null",
    }),
    phone: text("phone"),
    jobTitle: text("job_title"),
    nationalId: text("national_id"),
    dateOfBirth: date("date_of_birth"),
    address: text("address"),
    hireDate: date("hire_date"),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    deviceInfo: text("device_info"),
    status: employeeStatusEnum("status").notNull().default("active"),
    /** Allowed work zone center (WGS84). Null = no geofence. */
    geofenceLat: doublePrecision("geofence_lat"),
    geofenceLng: doublePrecision("geofence_lng"),
    /** Allowed radius in meters around the center. */
    geofenceRadiusMeters: integer("geofence_radius_meters"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("employees_user_uidx").on(t.userId),
    index("employees_tenant_idx").on(t.tenantId),
    index("employees_tenant_status_idx").on(t.tenantId, t.status),
    index("employees_tenant_branch_idx").on(t.tenantId, t.branchId),
  ],
);

/** Tenant-defined job functions (sales, driver, …). Distinct from access `users.role`. */
export const jobRoles = pgTable(
  "job_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("job_roles_tenant_name_uidx").on(t.tenantId, t.name),
    index("job_roles_tenant_idx").on(t.tenantId),
  ],
);

export const employeeJobRoles = pgTable(
  "employee_job_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    jobRoleId: uuid("job_role_id")
      .notNull()
      .references(() => jobRoles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("employee_job_roles_uidx").on(t.employeeId, t.jobRoleId),
    index("employee_job_roles_tenant_employee_idx").on(t.tenantId, t.employeeId),
    index("employee_job_roles_tenant_role_idx").on(t.tenantId, t.jobRoleId),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }).notNull(),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    clockInLat: doublePrecision("clock_in_lat"),
    clockInLng: doublePrecision("clock_in_lng"),
    clockOutLat: doublePrecision("clock_out_lat"),
    clockOutLng: doublePrecision("clock_out_lng"),
    clientEventId: text("client_event_id"),
    anomalyFlags: jsonb("anomaly_flags").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("attendance_tenant_employee_idx").on(t.tenantId, t.employeeId),
    index("attendance_tenant_open_idx").on(t.tenantId, t.clockOutAt),
    uniqueIndex("attendance_client_event_uidx").on(t.tenantId, t.clientEventId),
  ],
);

export const attendanceCorrections = pgTable(
  "attendance_corrections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    attendanceId: uuid("attendance_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "cascade" }),
    correctedByUserId: uuid("corrected_by_user_id")
      .notNull()
      .references(() => users.id),
    before: jsonb("before").notNull(),
    after: jsonb("after").notNull(),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("corrections_tenant_idx").on(t.tenantId, t.attendanceId)],
);

export const locationPings = pgTable(
  "location_pings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    clientPingId: text("client_ping_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pings_tenant_recorded_idx").on(t.tenantId, t.recordedAt),
    index("pings_tenant_employee_recorded_idx").on(
      t.tenantId,
      t.employeeId,
      t.recordedAt,
    ),
  ],
);

export const employeeLiveLocations = pgTable(
  "employee_live_locations",
  {
    employeeId: uuid("employee_id")
      .primaryKey()
      .references(() => employees.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    isClockedIn: boolean("is_clocked_in").notNull().default(true),
  },
  (t) => [
    index("live_locations_tenant_idx").on(t.tenantId),
    index("live_locations_tenant_clocked_idx").on(t.tenantId, t.isClockedIn),
  ],
);

export const kpiDefinitions = pgTable(
  "kpi_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: kpiTypeEnum("type").notNull(),
    targetValue: doublePrecision("target_value"),
    reviewPeriod: reviewPeriodEnum("review_period").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kpi_defs_tenant_idx").on(t.tenantId)],
);

export const kpiAssignments = pgTable(
  "kpi_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kpiId: uuid("kpi_id")
      .notNull()
      .references(() => kpiDefinitions.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    roleTarget: roleEnum("role_target"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kpi_assign_tenant_idx").on(t.tenantId, t.employeeId)],
);

export const kpiScores = pgTable(
  "kpi_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => kpiAssignments.id, { onDelete: "cascade" }),
    score: doublePrecision("score").notNull(),
    notes: text("notes"),
    reviewDate: timestamp("review_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewerUserId: uuid("reviewer_user_id")
      .notNull()
      .references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    acknowledgedByUserId: uuid("acknowledged_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("kpi_scores_tenant_idx").on(t.tenantId, t.assignmentId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    read: boolean("read").notNull().default(false),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    deliveryError: text("delivery_error"),
    category: alertCategoryEnum("category"),
    urgency: alertUrgencyEnum("urgency"),
    eventKey: text("event_key"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_tenant_user_idx").on(t.tenantId, t.userId),
    index("notifications_tenant_unread_idx").on(t.tenantId, t.userId, t.read),
    index("notifications_tenant_event_idx").on(t.tenantId, t.eventKey),
  ],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("push_endpoint_uidx").on(t.endpoint),
    index("push_tenant_user_idx").on(t.tenantId, t.userId),
  ],
);

export const healthMetrics = pgTable(
  "health_metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    metric: text("metric").notNull(),
    value: integer("value").notNull().default(1),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("health_metrics_tenant_metric_idx").on(t.tenantId, t.metric)],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    amountCents: integer("amount_cents").notNull().default(0),
    currency: text("currency").notNull().default("USD"),
    intervalDays: integer("interval_days").notNull().default(30),
    seatLimit: integer("seat_limit"),
    paymobPlanId: integer("paymob_plan_id"),
    polarProductId: text("polar_product_id"),
    active: boolean("active").notNull().default(true),
    features: jsonb("features").$type<PlanFeatures>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("plans_code_uidx").on(t.code),
    uniqueIndex("plans_polar_product_uidx").on(t.polarProductId),
  ],
);

/** Launch lifecycle for product modules (draft / lab / ga). */
export const platformModules = pgTable(
  "platform_modules",
  {
    key: text("key").primaryKey(),
    launchStatus: text("launch_status").notNull().default("ga"),
    labelOverride: text("label_override"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const tenantSubscriptions = pgTable(
  "tenant_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    paymobSubscriptionId: text("paymob_subscription_id"),
    paymobOrderId: text("paymob_order_id"),
    polarSubscriptionId: text("polar_subscription_id"),
    polarCustomerId: text("polar_customer_id"),
    /** Billed seat quantity from Polar (Ops/Scale). Null = use plan.seatLimit. */
    purchasedSeats: integer("purchased_seats"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tenant_subscriptions_tenant_uidx").on(t.tenantId),
    index("tenant_subscriptions_status_idx").on(t.status),
    index("tenant_subscriptions_paymob_uidx").on(t.paymobSubscriptionId),
    uniqueIndex("tenant_subscriptions_polar_uidx").on(t.polarSubscriptionId),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    provider: text("provider").notNull().default("paymob"),
    externalId: text("external_id").notNull(),
    triggerType: text("trigger_type").notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    subscriptionId: uuid("subscription_id").references(
      () => tenantSubscriptions.id,
      { onDelete: "set null" },
    ),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    processedAt: timestamp("processed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_events_provider_ext_trigger_uidx").on(
      t.provider,
      t.externalId,
      t.triggerType,
    ),
    index("payment_events_tenant_idx").on(t.tenantId),
  ],
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: leadSourceEnum("source").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),
    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    planCode: text("plan_code"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("leads_status_idx").on(t.status),
    index("leads_created_at_idx").on(t.createdAt),
    index("leads_email_idx").on(t.email),
    index("leads_tenant_idx").on(t.tenantId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role"),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_tenant_created_idx").on(t.tenantId, t.createdAt),
    index("audit_logs_action_created_idx").on(t.action, t.createdAt),
  ],
);

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    providerType: integrationProviderEnum("provider_type").notNull(),
    status: integrationStatusEnum("status").notNull().default("draft"),
    authType: integrationAuthTypeEnum("auth_type").notNull().default("none"),
    authConfigEncrypted: text("auth_config_encrypted"),
    baseUrl: text("base_url"),
    webhookSecretEncrypted: text("webhook_secret_encrypted"),
    syncMode: integrationSyncModeEnum("sync_mode").notNull().default("manual"),
    pollIntervalMinutes: integer("poll_interval_minutes"),
    connectorConfig: jsonb("connector_config")
      .$type<IntegrationConnectorConfig>()
      .notNull()
      .default({}),
    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("integration_connections_tenant_idx").on(t.tenantId),
    index("integration_connections_tenant_status_idx").on(t.tenantId, t.status),
  ],
);

export const integrationFieldMappings = pgTable(
  "integration_field_mappings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    sourceEntity: text("source_entity").notNull(),
    sourceField: text("source_field").notNull(),
    targetEntity: text("target_entity").notNull(),
    targetField: text("target_field").notNull(),
    transformType: fieldTransformTypeEnum("transform_type")
      .notNull()
      .default("direct"),
    transformConfig: jsonb("transform_config")
      .$type<FieldTransformConfig>()
      .notNull()
      .default({}),
    isRequired: boolean("is_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("integration_mappings_connection_idx").on(
      t.tenantId,
      t.connectionId,
    ),
  ],
);

export const integrationSyncRuns = pgTable(
  "integration_sync_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    triggerType: integrationSyncTriggerEnum("trigger_type").notNull(),
    status: integrationSyncRunStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    recordsReceived: integer("records_received").notNull().default(0),
    recordsProcessed: integer("records_processed").notNull().default(0),
    recordsFailed: integer("records_failed").notNull().default(0),
    errorSummary: text("error_summary"),
    cursorJson: jsonb("cursor_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (t) => [
    index("integration_sync_runs_connection_idx").on(
      t.tenantId,
      t.connectionId,
      t.startedAt,
    ),
  ],
);

export const integrationRawEvents = pgTable(
  "integration_raw_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    syncRunId: uuid("sync_run_id").references(() => integrationSyncRuns.id, {
      onDelete: "set null",
    }),
    sourceEventType: text("source_event_type").notNull(),
    externalRecordId: text("external_record_id").notNull(),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingStatus: integrationProcessingStatusEnum("processing_status")
      .notNull()
      .default("pending"),
    errorDetails: text("error_details"),
  },
  (t) => [
    uniqueIndex("integration_raw_events_ext_uidx").on(
      t.tenantId,
      t.connectionId,
      t.externalRecordId,
      t.sourceEventType,
    ),
    index("integration_raw_events_status_idx").on(
      t.tenantId,
      t.processingStatus,
    ),
    index("integration_raw_events_received_idx").on(t.tenantId, t.receivedAt),
  ],
);

export const externalEmployeeLinks = pgTable(
  "external_employee_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalEmployeeKey: text("external_employee_key").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    matchConfidence: doublePrecision("match_confidence").notNull().default(1),
    matchMethod: identityMatchMethodEnum("match_method").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("external_employee_links_uidx").on(
      t.tenantId,
      t.connectionId,
      t.externalEmployeeKey,
    ),
    index("external_employee_links_employee_idx").on(t.tenantId, t.employeeId),
  ],
);

export const externalBranchLinks = pgTable(
  "external_branch_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalBranchKey: text("external_branch_key").notNull(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("external_branch_links_uidx").on(
      t.tenantId,
      t.connectionId,
      t.externalBranchKey,
    ),
  ],
);

export const canonicalCustomers = pgTable(
  "canonical_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    name: text("name").notNull(),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_customers_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
  ],
);

export const canonicalProjects = pgTable(
  "canonical_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    customerId: uuid("customer_id").references(() => canonicalCustomers.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    status: text("status"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_projects_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
  ],
);

export const canonicalJobEvents = pgTable(
  "canonical_job_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => canonicalCustomers.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => canonicalProjects.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull().default("completed"),
    status: text("status"),
    title: text("title"),
    category: text("category"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    durationMinutes: integer("duration_minutes"),
    valueAmount: doublePrecision("value_amount"),
    currency: text("currency"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_job_events_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
    index("canonical_job_events_employee_idx").on(
      t.tenantId,
      t.employeeId,
      t.occurredAt,
    ),
    index("canonical_job_events_branch_idx").on(
      t.tenantId,
      t.branchId,
      t.occurredAt,
    ),
  ],
);

export const canonicalVisitEvents = pgTable(
  "canonical_visit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    siteId: uuid("site_id").references(() => sites.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => canonicalCustomers.id, {
      onDelete: "set null",
    }),
    checkInAt: timestamp("check_in_at", { withTimezone: true }),
    checkOutAt: timestamp("check_out_at", { withTimezone: true }),
    visitDurationMinutes: integer("visit_duration_minutes"),
    visitStatus: text("visit_status"),
    revenueAmount: doublePrecision("revenue_amount"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_visit_events_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
    index("canonical_visit_events_employee_idx").on(
      t.tenantId,
      t.employeeId,
      t.checkInAt,
    ),
  ],
);

export const canonicalTaskEvents = pgTable(
  "canonical_task_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    taskType: text("task_type"),
    priority: text("priority"),
    status: text("status"),
    points: doublePrecision("points"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_task_events_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
    index("canonical_task_events_employee_idx").on(t.tenantId, t.employeeId),
  ],
);

export const canonicalSalesEvents = pgTable(
  "canonical_sales_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sourceConnectionId: uuid("source_connection_id")
      .notNull()
      .references(() => integrationConnections.id, { onDelete: "cascade" }),
    externalRecordId: text("external_record_id").notNull(),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => canonicalCustomers.id, {
      onDelete: "set null",
    }),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    amount: doublePrecision("amount").notNull().default(0),
    currency: text("currency"),
    status: text("status"),
    metadataJson: jsonb("metadata_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("canonical_sales_events_ext_uidx").on(
      t.tenantId,
      t.sourceConnectionId,
      t.externalRecordId,
    ),
    index("canonical_sales_events_employee_idx").on(
      t.tenantId,
      t.employeeId,
      t.eventDate,
    ),
  ],
);

export const employeeDailyAnalytics = pgTable(
  "employee_daily_analytics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    branchId: uuid("branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    wasClockedIn: boolean("was_clocked_in").notNull().default(false),
    totalWorkMinutes: integer("total_work_minutes").notNull().default(0),
    overtimeMinutes: integer("overtime_minutes").notNull().default(0),
    latenessMinutes: integer("lateness_minutes").notNull().default(0),
    gpsUpdatesCount: integer("gps_updates_count").notNull().default(0),
    gpsExpectedCount: integer("gps_expected_count").notNull().default(0),
    offRouteFlags: integer("off_route_flags").notNull().default(0),
    jobsCompletedCount: integer("jobs_completed_count").notNull().default(0),
    visitsCompletedCount: integer("visits_completed_count").notNull().default(0),
    tasksCompletedCount: integer("tasks_completed_count").notNull().default(0),
    tasksAssignedCount: integer("tasks_assigned_count").notNull().default(0),
    revenueGenerated: doublePrecision("revenue_generated").notNull().default(0),
    laborCostEstimate: doublePrecision("labor_cost_estimate")
      .notNull()
      .default(0),
    kpiScore: doublePrecision("kpi_score"),
    productivityScore: doublePrecision("productivity_score")
      .notNull()
      .default(0),
    anomalyScore: doublePrecision("anomaly_score").notNull().default(0),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("employee_daily_analytics_uidx").on(
      t.tenantId,
      t.employeeId,
      t.day,
    ),
    index("employee_daily_analytics_branch_idx").on(t.tenantId, t.branchId, t.day),
  ],
);

export const branchDailyAnalytics = pgTable(
  "branch_daily_analytics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    activeEmployees: integer("active_employees").notNull().default(0),
    clockedInEmployees: integer("clocked_in_employees").notNull().default(0),
    attendanceRate: doublePrecision("attendance_rate").notNull().default(0),
    latenessRate: doublePrecision("lateness_rate").notNull().default(0),
    missedClockOuts: integer("missed_clock_outs").notNull().default(0),
    jobsCompletedCount: integer("jobs_completed_count").notNull().default(0),
    visitsCompletedCount: integer("visits_completed_count").notNull().default(0),
    revenueGenerated: doublePrecision("revenue_generated").notNull().default(0),
    laborCostEstimate: doublePrecision("labor_cost_estimate")
      .notNull()
      .default(0),
    productivityIndex: doublePrecision("productivity_index")
      .notNull()
      .default(0),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("branch_daily_analytics_uidx").on(t.tenantId, t.branchId, t.day),
  ],
);

export const analyticsMetricDefinitions = pgTable(
  "analytics_metric_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    formulaType: metricFormulaTypeEnum("formula_type")
      .notNull()
      .default("expression"),
    formulaConfig: jsonb("formula_config")
      .$type<MetricFormulaConfig>()
      .notNull()
      .default({}),
    aggregationLevel: metricAggregationLevelEnum("aggregation_level")
      .notNull()
      .default("tenant"),
    timeGrain: metricTimeGrainEnum("time_grain").notNull().default("day"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("analytics_metric_defs_uidx").on(t.tenantId, t.key, t.version),
    index("analytics_metric_defs_key_idx").on(t.key),
  ],
);

export const analyticsMetricResults = pgTable(
  "analytics_metric_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    metricDefinitionId: uuid("metric_definition_id")
      .notNull()
      .references(() => analyticsMetricDefinitions.id, { onDelete: "cascade" }),
    entityType: analyticsEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    dateBucket: date("date_bucket").notNull(),
    valueNumeric: doublePrecision("value_numeric").notNull().default(0),
    valueJson: jsonb("value_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    version: integer("version").notNull().default(1),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("analytics_metric_results_uidx").on(
      t.tenantId,
      t.metricDefinitionId,
      t.entityType,
      t.entityId,
      t.dateBucket,
      t.version,
    ),
    index("analytics_metric_results_lookup_idx").on(
      t.tenantId,
      t.entityType,
      t.dateBucket,
    ),
  ],
);

export const analyticsAlerts = pgTable(
  "analytics_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    alertType: analyticsAlertTypeEnum("alert_type").notNull(),
    severity: analyticsAlertSeverityEnum("severity").notNull().default("medium"),
    entityType: analyticsEntityTypeEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    alertDate: date("alert_date").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    payloadJson: jsonb("payload_json")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    status: analyticsAlertStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("analytics_alerts_tenant_status_idx").on(t.tenantId, t.status),
    index("analytics_alerts_tenant_date_idx").on(t.tenantId, t.alertDate),
  ],
);

export const alertRules = pgTable(
  "alert_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    kind: alertRuleKindEnum("kind").notNull().default("catalog"),
    eventKey: text("event_key").notNull(),
    category: alertCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    enabled: boolean("enabled").notNull().default(true),
    urgency: alertUrgencyEnum("urgency").notNull().default("warning"),
    channels: jsonb("channels")
      .$type<Array<"in_app" | "email" | "digest">>()
      .notNull()
      .default(["in_app"]),
    frequency: alertFrequencyEnum("frequency").notNull().default("instant"),
    recipients: jsonb("recipients")
      .$type<
        Array<
          | "admin"
          | "hr_manager"
          | "direct_manager"
          | "branch_manager"
          | "employee"
        >
      >()
      .notNull()
      .default(["admin"]),
    escalateAfterHours: integer("escalate_after_hours"),
    source: alertSourceEnum("source"),
    condition: alertConditionEnum("condition"),
    metric: alertMetricEnum("metric"),
    threshold: doublePrecision("threshold"),
    durationValue: integer("duration_value"),
    durationUnit: alertDurationUnitEnum("duration_unit"),
    scope: alertScopeEnum("scope"),
    scopeId: uuid("scope_id"),
    titleTemplate: text("title_template"),
    bodyTemplate: text("body_template"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("alert_rules_tenant_event_uidx").on(t.tenantId, t.eventKey),
    index("alert_rules_tenant_kind_idx").on(t.tenantId, t.kind),
    index("alert_rules_tenant_category_idx").on(t.tenantId, t.category),
  ],
);

export const leaveStates = pgTable("leave_states", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot")
    .$type<{
      types?: unknown;
      policies?: unknown;
      balances?: unknown;
      transactions?: unknown;
      requests?: unknown;
      notifications?: unknown;
    }>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Tenant-scoped Hiring module snapshot (jobs, candidates, pipeline, offers…). */
export const hiringStates = pgTable("hiring_states", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Tenant-scoped Compensation module snapshot (pay records, requests, bands…). */
export const compensationStates = pgTable("compensation_states", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress",
  "submitted",
  "changes_requested",
  "completed",
  "cancelled",
]);

export const taskAssignmentModeEnum = pgEnum("task_assignment_mode", [
  "shared",
  "individual",
]);

export const taskAttachmentKindEnum = pgEnum("task_attachment_kind", [
  "link",
  "file",
]);

export const taskDeliverableTypeEnum = pgEnum("task_deliverable_type", [
  "report",
  "docs",
  "screenshots",
  "other",
]);

export const taskActivityKindEnum = pgEnum("task_activity_kind", [
  "created",
  "started",
  "attached",
  "deliverable_submitted",
  "completed",
  "submitted",
  "reviewed",
  "send_back",
  "cancelled",
]);

export type TaskAssigneeTargets = {
  employeeIds: string[];
  jobRoleIds: string[];
  branchIds: string[];
};

/** First-class HR tasks (not integration canonical_task_events). */
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    status: taskStatusEnum("status").notNull().default("open"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    requiresReview: boolean("requires_review").notNull().default(false),
    assignmentMode: taskAssignmentModeEnum("assignment_mode")
      .notNull()
      .default("shared"),
    batchId: uuid("batch_id"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    assigneeTargets: jsonb("assignee_targets")
      .$type<TaskAssigneeTargets>()
      .notNull()
      .default({ employeeIds: [], jobRoleIds: [], branchIds: [] }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewNote: text("review_note"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("tasks_tenant_idx").on(t.tenantId),
    index("tasks_tenant_status_idx").on(t.tenantId, t.status),
    index("tasks_tenant_due_idx").on(t.tenantId, t.dueAt),
    index("tasks_tenant_batch_idx").on(t.tenantId, t.batchId),
  ],
);

export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("task_assignees_task_employee_uidx").on(t.taskId, t.employeeId),
    index("task_assignees_tenant_employee_idx").on(t.tenantId, t.employeeId),
    index("task_assignees_tenant_task_idx").on(t.tenantId, t.taskId),
  ],
);

export const taskAttachments = pgTable(
  "task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    kind: taskAttachmentKindEnum("kind").notNull(),
    name: text("name").notNull(),
    mime: text("mime"),
    size: integer("size"),
    url: text("url"),
    dataUrl: text("data_url"),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("task_attachments_tenant_task_idx").on(t.tenantId, t.taskId)],
);

export const taskDeliverableRequirements = pgTable(
  "task_deliverable_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    type: taskDeliverableTypeEnum("type").notNull(),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("task_deliverable_reqs_tenant_task_idx").on(t.tenantId, t.taskId),
  ],
);

export const taskDeliverableSubmissions = pgTable(
  "task_deliverable_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => taskDeliverableRequirements.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: taskAttachmentKindEnum("kind").notNull(),
    name: text("name").notNull(),
    mime: text("mime"),
    size: integer("size"),
    url: text("url"),
    dataUrl: text("data_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("task_deliverable_subs_tenant_task_idx").on(t.tenantId, t.taskId),
    index("task_deliverable_subs_req_idx").on(t.requirementId),
  ],
);

export const taskActivity = pgTable(
  "task_activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    kind: taskActivityKindEnum("kind").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorEmployeeId: uuid("actor_employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    message: text("message").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("task_activity_tenant_task_idx").on(t.tenantId, t.taskId),
    index("task_activity_tenant_created_idx").on(t.tenantId, t.createdAt),
  ],
);

export const shiftPatterns = pgTable(
  "shift_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    cadence: shiftCadenceEnum("cadence").notNull(),
    /** YYYY-MM-DD — required for daily cadence. */
    workDate: date("work_date"),
    /** Weekday numbers 0–6 (Sun–Sat) for weekly cadence. */
    weekdays: jsonb("weekdays").$type<number[]>().notNull().default([]),
    /** Days of month 1–31 for monthly cadence. */
    monthDays: jsonb("month_days").$type<number[]>().notNull().default([]),
    /** Local HH:MM in tenant timezone. */
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    effectiveFrom: date("effective_from"),
    effectiveUntil: date("effective_until"),
    active: boolean("active").notNull().default(true),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("shift_patterns_tenant_employee_idx").on(t.tenantId, t.employeeId),
    index("shift_patterns_tenant_active_idx").on(t.tenantId, t.active),
  ],
);

export const shiftInstances = pgTable(
  "shift_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    patternId: uuid("pattern_id").references(() => shiftPatterns.id, {
      onDelete: "set null",
    }),
    workDate: date("work_date").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: shiftInstanceStatusEnum("status").notNull().default("scheduled"),
    attendanceRecordId: uuid("attendance_record_id").references(
      () => attendanceRecords.id,
      { onDelete: "set null" },
    ),
    lateClockIn: boolean("late_clock_in").notNull().default(false),
    lateClockOut: boolean("late_clock_out").notNull().default(false),
    overtimeStatus: shiftOvertimeStatusEnum("overtime_status")
      .notNull()
      .default("none"),
    overtimePromptedAt: timestamp("overtime_prompted_at", {
      withTimezone: true,
    }),
    overtimeRespondedAt: timestamp("overtime_responded_at", {
      withTimezone: true,
    }),
    autoClockOutReason: text("auto_clock_out_reason"),
    dayDeduction: boolean("day_deduction").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("shift_instances_employee_date_uidx").on(
      t.tenantId,
      t.employeeId,
      t.workDate,
    ),
    index("shift_instances_tenant_date_idx").on(t.tenantId, t.workDate),
    index("shift_instances_tenant_employee_idx").on(t.tenantId, t.employeeId),
  ],
);

export const breakPolicies = pgTable(
  "break_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    /** Null = global tenant default. */
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "cascade",
    }),
    enabled: boolean("enabled").notNull().default(true),
    durationMinutes: integer("duration_minutes").notNull().default(60),
    periodMode: breakPeriodModeEnum("period_mode").notNull().default("flexible"),
    fixedStartTime: text("fixed_start_time"),
    fixedEndTime: text("fixed_end_time"),
    maxBreaksPerShift: integer("max_breaks_per_shift").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("break_policies_tenant_idx").on(t.tenantId)],
);

export const breakSessions = pgTable(
  "break_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftInstanceId: uuid("shift_instance_id")
      .notNull()
      .references(() => shiftInstances.id, { onDelete: "cascade" }),
    attendanceRecordId: uuid("attendance_record_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "cascade" }),
    status: breakSessionStatusEnum("status").notNull().default("scheduled"),
    plannedStartAt: timestamp("planned_start_at", { withTimezone: true }),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    source: breakSessionSourceEnum("source").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("break_sessions_tenant_employee_idx").on(t.tenantId, t.employeeId),
    index("break_sessions_shift_idx").on(t.shiftInstanceId),
    index("break_sessions_status_idx").on(t.tenantId, t.status),
  ],
);

export const leftZoneIncidents = pgTable(
  "left_zone_incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    shiftInstanceId: uuid("shift_instance_id").references(
      () => shiftInstances.id,
      { onDelete: "set null" },
    ),
    attendanceRecordId: uuid("attendance_record_id")
      .notNull()
      .references(() => attendanceRecords.id, { onDelete: "cascade" }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    phase: leftZonePhaseEnum("phase").notNull(),
    status: leftZoneIncidentStatusEnum("status").notNull().default("pending"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("left_zone_incidents_tenant_status_idx").on(t.tenantId, t.status),
    index("left_zone_incidents_tenant_employee_idx").on(
      t.tenantId,
      t.employeeId,
    ),
  ],
);
