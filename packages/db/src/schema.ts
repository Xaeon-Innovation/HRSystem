import {
  boolean,
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
]);

export type TenantSettings = {
  brandingName?: string;
  logoUrl?: string | null;
  timezone?: string;
  pingIntervalSec?: number;
  locationRetentionDays?: number;
  missedClockOutHours?: number;
};

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: tenantStatusEnum("status").notNull().default("active"),
    settings: jsonb("settings").$type<TenantSettings>().notNull().default({}),
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
    phone: text("phone"),
    jobTitle: text("job_title"),
    deviceInfo: text("device_info"),
    status: employeeStatusEnum("status").notNull().default("active"),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notifications_tenant_user_idx").on(t.tenantId, t.userId),
    index("notifications_tenant_unread_idx").on(t.tenantId, t.userId, t.read),
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
