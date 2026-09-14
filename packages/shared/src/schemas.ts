import { z } from "zod";
import {
  EMPLOYEE_STATUSES,
  FIELD_TRANSFORM_TYPES,
  IDENTITY_MATCH_METHODS,
  INTEGRATION_AUTH_TYPES,
  INTEGRATION_CONNECTION_STATUSES,
  INTEGRATION_PROVIDER_TYPES,
  INTEGRATION_SYNC_MODES,
  KPI_TYPES,
  MAX_PING_INTERVAL_SEC,
  MIN_PING_INTERVAL_SEC,
  NOTIFICATION_TYPES,
  PAYMOB_INTERVAL_DAYS,
  REVIEW_PERIODS,
  ROLES,
  SYSTEM_MODULE_ROLES,
  normalizeSystemModuleRoles,
  SUBSCRIPTION_STATUSES,
  TENANT_STATUSES,
  CANONICAL_TARGET_ENTITIES,
  BRANCH_STATUSES,
  ANALYTICS_ALERT_STATUSES,
} from "./constants.js";
import {
  ALERT_CATEGORIES,
  ALERT_CHANNELS,
  ALERT_CONDITIONS,
  ALERT_DURATION_UNITS,
  ALERT_FREQUENCIES,
  ALERT_METRICS,
  ALERT_RECIPIENTS,
  ALERT_SCOPES,
  ALERT_SOURCES,
  ALERT_URGENCIES,
} from "./alerts.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const uploadAvatarSchema = z.object({
  imageBase64: z.string().min(32).max(2_800_000),
});

export const uploadLogoSchema = uploadAvatarSchema;

export const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2).max(120),
});

export const publicSignupSchema = createTenantSchema.extend({
  acceptTerms: z.literal(true),
});

export const publicDemoRequestSchema = z.object({
  name: z.string().min(2).max(120),
  company: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  message: z.string().max(2000).optional(),
});

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a hex color");

export const mapAppearanceSchema = z.object({
  themeId: z.enum([
    "teal",
    "ocean",
    "forest",
    "sunset",
    "midnight",
    "minimal",
    "coral",
    "slate",
    "custom",
  ]),
  tileStyle: z.enum(["voyager", "positron", "osm", "dark"]),
  markerStyle: z.enum(["pulse", "soft", "pin"]),
  onShiftColor: hexColor,
  lastSeenColor: hexColor,
  trailColor: hexColor,
  showInitials: z.boolean(),
});

export const updateMapAppearanceSchema = mapAppearanceSchema.partial();

export const brandPresetSchema = z.enum([
  "neutral",
  "teal",
  "forest",
  "slate",
]);

export const updateBrandingSchema = z.object({
  brandingName: z.string().min(1).max(120).optional(),
  /** @deprecated Logos are uploaded as files; this field is ignored on write. */
  logoUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional(),
  brandPreset: brandPresetSchema.optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(TENANT_STATUSES).optional(),
  settings: z
    .object({
      brandingName: z.string().optional(),
      logoUrl: z.string().url().optional().nullable(),
      brandPreset: brandPresetSchema.optional(),
      timezone: z.string().optional(),
      pingIntervalSec: z
        .number()
        .int()
        .min(MIN_PING_INTERVAL_SEC)
        .max(MAX_PING_INTERVAL_SEC)
        .optional(),
      locationRetentionDays: z.number().int().min(30).max(90).optional(),
      missedClockOutHours: z.number().positive().optional(),
      defaultHourlyCost: z.number().min(0).optional(),
      integrationRawRetentionDays: z.number().int().min(30).max(90).optional(),
      latenessGraceMinutes: z.number().int().min(0).max(180).optional(),
      shiftStartHour: z.number().int().min(0).max(23).optional(),
      map: updateMapAppearanceSchema.optional(),
    })
    .partial()
    .optional(),
});

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const systemModuleRolesSchema = z
  .array(z.enum(SYSTEM_MODULE_ROLES))
  .max(SYSTEM_MODULE_ROLES.length)
  .optional()
  .transform((roles) =>
    roles === undefined ? undefined : normalizeSystemModuleRoles(roles),
  );

const employeeBaseFields = {
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["tenant_admin", "employee"]).default("employee"),
  phone: z.string().min(6).max(40),
  jobTitle: z.string().min(1).max(120),
  nationalId: z.string().min(5).max(40),
  dateOfBirth: isoDate,
  address: z.string().min(3).max(300),
  hireDate: isoDate,
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
  status: z.enum(EMPLOYEE_STATUSES).default("active"),
  branchId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
  branchCode: z.string().max(40).optional().nullable(),
  geofenceLat: z.number().min(-90).max(90).optional().nullable(),
  geofenceLng: z.number().min(-180).max(180).optional().nullable(),
  geofenceRadiusMeters: z
    .number()
    .int()
    .min(50)
    .max(50_000)
    .optional()
    .nullable(),
  jobRoleIds: z.array(z.string().uuid()).max(50).optional(),
  systemModuleRoles: systemModuleRolesSchema,
  managerId: z.string().uuid().optional().nullable(),
};

export const createEmployeeSchema = z
  .object(employeeBaseFields)
  .superRefine((data, ctx) => {
    const parts = [data.geofenceLat, data.geofenceLng, data.geofenceRadiusMeters];
    const provided = parts.filter((v) => v != null).length;
    if (provided > 0 && provided < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Geofence requires lat, lng, and radiusMeters together (or all null to clear)",
        path: ["geofenceRadiusMeters"],
      });
    }
  });

export const setEmployeePasswordSchema = z.object({
  password: z.string().min(8).max(72),
});

export const updateEmployeeSchema = z
  .object(employeeBaseFields)
  .partial()
  .omit({
    password: true,
    branchCode: true,
  })
  .extend({
    phone: z.string().min(6).max(40).optional().nullable(),
    jobTitle: z.string().min(1).max(120).optional().nullable(),
    nationalId: z.string().min(5).max(40).optional().nullable(),
    dateOfBirth: isoDate.optional().nullable(),
    address: z.string().min(3).max(300).optional().nullable(),
    hireDate: isoDate.optional().nullable(),
    emergencyContactName: z.string().max(120).optional().nullable(),
    emergencyContactPhone: z.string().max(40).optional().nullable(),
    status: z.enum(EMPLOYEE_STATUSES).optional(),
    contactPhone: z.string().max(40).optional().nullable(),
    branchId: z.string().uuid().optional().nullable(),
    siteId: z.string().uuid().optional().nullable(),
    geofenceLat: z.number().min(-90).max(90).optional().nullable(),
    geofenceLng: z.number().min(-180).max(180).optional().nullable(),
    geofenceRadiusMeters: z
      .number()
      .int()
      .min(50)
      .max(50_000)
      .optional()
      .nullable(),
    managerId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasAny =
      data.geofenceLat !== undefined ||
      data.geofenceLng !== undefined ||
      data.geofenceRadiusMeters !== undefined;
    if (!hasAny) return;
    const clearing =
      data.geofenceLat === null &&
      data.geofenceLng === null &&
      data.geofenceRadiusMeters === null;
    if (clearing) return;
    if (
      data.geofenceLat == null ||
      data.geofenceLng == null ||
      data.geofenceRadiusMeters == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Geofence requires lat, lng, and radiusMeters together (or all null to clear)",
        path: ["geofenceRadiusMeters"],
      });
    }
  });

export const importEmployeesBodySchema = z
  .object({
    csv: z.string().min(1).max(2_000_000).optional(),
    employees: z.array(createEmployeeSchema).min(1).max(500).optional(),
  })
  .refine((d) => Boolean(d.csv || d.employees?.length), {
    message: "csv or employees required",
  });

export const clockEventSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  clientEventId: z.string().uuid().optional(),
  clientTimestamp: z.string().datetime().optional(),
});

export const correctAttendanceSchema = z.object({
  clockInAt: z.string().datetime().optional(),
  clockOutAt: z.string().datetime().nullable().optional(),
  note: z.string().min(1).max(1000),
});

export const locationPingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  recordedAt: z.string().datetime().optional(),
  clientPingId: z.string().uuid().optional(),
});

export const createKpiSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(KPI_TYPES),
  targetValue: z.number().optional().nullable(),
  reviewPeriod: z.enum(REVIEW_PERIODS),
  description: z.string().max(1000).optional().nullable(),
});

export const updateKpiSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    type: z.enum(KPI_TYPES).optional(),
    targetValue: z.number().optional().nullable(),
    reviewPeriod: z.enum(REVIEW_PERIODS).optional(),
    description: z.string().max(1000).optional().nullable(),
  })
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "No fields to update",
  });

export const assignKpiSchema = z.object({
  kpiId: z.string().uuid(),
  employeeId: z.string().uuid().optional(),
  roleTarget: z.enum(ROLES).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

export const recordKpiScoreSchema = z.object({
  assignmentId: z.string().uuid(),
  score: z.number(),
  notes: z.string().max(2000).optional().nullable(),
  reviewDate: z.string().datetime().optional(),
});

export const acknowledgeKpiScoresSchema = z.object({
  scoreIds: z.array(z.string().uuid()).min(1).max(50),
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  roleFilter: z.enum(["tenant_admin", "employee"]).optional(),
});

const alertChannelsSchema = z.array(z.enum(ALERT_CHANNELS)).min(1);
const alertRecipientsSchema = z.array(z.enum(ALERT_RECIPIENTS)).min(1);

export const updateAlertRuleSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(500).nullable().optional(),
  urgency: z.enum(ALERT_URGENCIES).optional(),
  channels: alertChannelsSchema.optional(),
  frequency: z.enum(ALERT_FREQUENCIES).optional(),
  recipients: alertRecipientsSchema.optional(),
  escalateAfterHours: z.number().int().min(1).max(720).nullable().optional(),
  source: z.enum(ALERT_SOURCES).optional(),
  condition: z.enum(ALERT_CONDITIONS).optional(),
  metric: z.enum(ALERT_METRICS).optional(),
  threshold: z.number().nullable().optional(),
  durationValue: z.number().int().min(1).max(3650).nullable().optional(),
  durationUnit: z.enum(ALERT_DURATION_UNITS).nullable().optional(),
  scope: z.enum(ALERT_SCOPES).optional(),
  scopeId: z.string().uuid().nullable().optional(),
  titleTemplate: z.string().min(1).max(200).nullable().optional(),
  bodyTemplate: z.string().min(1).max(2000).nullable().optional(),
});

export const createCustomAlertRuleSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(500).optional().nullable(),
  urgency: z.enum(ALERT_URGENCIES),
  channels: alertChannelsSchema,
  frequency: z.enum(ALERT_FREQUENCIES),
  recipients: alertRecipientsSchema,
  escalateAfterHours: z.number().int().min(1).max(720).nullable().optional(),
  enabled: z.boolean().optional().default(true),
  source: z.enum(ALERT_SOURCES),
  condition: z.enum(ALERT_CONDITIONS),
  metric: z.enum(ALERT_METRICS),
  threshold: z.number().nullable().optional(),
  durationValue: z.number().int().min(1).max(3650).nullable().optional(),
  durationUnit: z.enum(ALERT_DURATION_UNITS).nullable().optional(),
  scope: z.enum(ALERT_SCOPES),
  scopeId: z.string().uuid().nullable().optional(),
  titleTemplate: z.string().min(1).max(200),
  bodyTemplate: z.string().min(1).max(2000),
});

export const notificationListQuerySchema = z.object({
  unread: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v == null ? undefined : v === "true")),
  category: z.enum(ALERT_CATEGORIES).optional(),
  urgency: z.enum(ALERT_URGENCIES).optional(),
});

export const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(ROLES),
  tenantId: z.string().uuid().nullable(),
  employeeId: z.string().uuid().nullable().optional(),
  systemModuleRoles: z
    .array(z.enum(SYSTEM_MODULE_ROLES))
    .max(SYSTEM_MODULE_ROLES.length)
    .optional()
    .transform((roles) => normalizeSystemModuleRoles(roles)),
});

export const createPlanSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Code must be lowercase alphanumeric with underscores"),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  amountCents: z.number().int().min(0),
  currency: z.string().length(3).default("USD"),
  intervalDays: z.number().int().refine(
    (v) => (PAYMOB_INTERVAL_DAYS as readonly number[]).includes(v),
    { message: "Invalid Paymob interval" },
  ),
  seatLimit: z.number().int().positive().nullable().optional(),
  active: z.boolean().optional().default(true),
  features: z.record(z.union([z.boolean(), z.number(), z.string()])).optional(),
  syncPaymob: z.boolean().optional(),
});

export const updatePlanSchema = createPlanSchema.partial().omit({ code: true });

export const billingCheckoutSchema = z.object({
  planId: z.string().uuid(),
  billingData: z
    .object({
      firstName: z.string().min(1).max(100).optional(),
      lastName: z.string().min(1).max(100).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
      country: z.string().max(60).optional(),
    })
    .optional(),
});

export const updateSubscriptionSchema = z.object({
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  planId: z.string().uuid().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
  currentPeriodEnd: z.string().datetime().optional().nullable(),
  trialEndsAt: z.string().datetime().optional().nullable(),
});

export const auditQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  action: z.string().min(1).max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type PublicSignupInput = z.infer<typeof publicSignupSchema>;
export type PublicDemoRequestInput = z.infer<typeof publicDemoRequestSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ImportEmployeesBody = z.infer<typeof importEmployeesBodySchema>;
export type ClockEventInput = z.infer<typeof clockEventSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type NotificationTypeInput = (typeof NOTIFICATION_TYPES)[number];
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type BillingCheckoutInput = z.infer<typeof billingCheckoutSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>;
export type CreateCustomAlertRuleInput = z.infer<typeof createCustomAlertRuleSchema>;

export const createJobRoleSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const updateJobRoleSchema = createJobRoleSchema.partial();

export const createBranchSchema = z.object({
  name: z.string().min(1).max(120),
  code: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, "Code must be alphanumeric with _ or -"),
  status: z.enum(BRANCH_STATUSES).optional().default("active"),
});

export const updateBranchSchema = createBranchSchema.partial();

export const createSiteSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(120),
  code: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/, "Code must be alphanumeric with _ or -"),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
});

export const updateSiteSchema = createSiteSchema.partial();

export const integrationAuthConfigSchema = z.object({
  apiKey: z.string().max(2000).optional(),
  apiKeyHeader: z.string().max(80).optional(),
  bearerToken: z.string().max(4000).optional(),
  username: z.string().max(200).optional(),
  password: z.string().max(500).optional(),
  headerName: z.string().max(80).optional(),
  refreshToken: z.string().max(4000).optional(),
  tokenExpiresAt: z.string().max(40).optional(),
});

export const integrationConnectorEntitySchema = z.object({
  sourceEntity: z.string().min(1).max(80),
  path: z.string().min(1).max(500),
  method: z.enum(["GET", "POST"]).optional(),
  itemsPath: z.string().max(200).optional(),
  idField: z.string().max(80).optional(),
  updatedAtField: z.string().max(80).optional(),
  eventType: z.string().max(80).optional(),
});

export const integrationConnectorConfigSchema = z.object({
  entities: z.array(integrationConnectorEntitySchema).optional(),
  pagination: z
    .object({
      type: z.enum(["none", "page", "cursor"]),
      pageParam: z.string().max(40).optional(),
      cursorParam: z.string().max(40).optional(),
      cursorPath: z.string().max(80).optional(),
    })
    .optional(),
  hmacHeader: z.string().max(80).optional(),
  hmacPayloadPath: z.string().max(80).optional(),
  preset: z.string().max(80).optional(),
  authStrategy: z.string().max(40).optional(),
});

export const createIntegrationConnectionSchema = z.object({
  name: z.string().min(1).max(120),
  providerType: z.enum(INTEGRATION_PROVIDER_TYPES),
  status: z.enum(INTEGRATION_CONNECTION_STATUSES).optional(),
  authType: z.enum(INTEGRATION_AUTH_TYPES).optional(),
  authConfig: integrationAuthConfigSchema.optional(),
  webhookSecret: z.string().max(500).optional().nullable(),
  baseUrl: z.string().url().max(500).optional().nullable(),
  syncMode: z.enum(INTEGRATION_SYNC_MODES).optional(),
  pollIntervalMinutes: z.number().int().min(5).max(1440).optional().nullable(),
  connectorConfig: integrationConnectorConfigSchema.optional(),
  preset: z.enum(["creative_cms_goals"]).optional(),
});

export const updateIntegrationConnectionSchema =
  createIntegrationConnectionSchema.partial();

export const upsertFieldMappingSchema = z.object({
  mappings: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        sourceEntity: z.string().min(1).max(80),
        sourceField: z.string().min(1).max(200),
        targetEntity: z.enum(CANONICAL_TARGET_ENTITIES),
        targetField: z.string().min(1).max(80),
        transformType: z.enum(FIELD_TRANSFORM_TYPES).optional(),
        transformConfig: z
          .object({
            enumMap: z.record(z.string()).optional(),
            dateFormat: z.string().optional(),
            customExpression: z.string().max(500).optional(),
          })
          .optional(),
        isRequired: z.boolean().optional(),
      }),
    )
    .max(200),
});

export const csvImportSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
  sourceEntity: z.string().min(1).max(80),
  targetEntity: z.enum(CANONICAL_TARGET_ENTITIES),
});

export const createEmployeeLinkSchema = z.object({
  connectionId: z.string().uuid(),
  externalEmployeeKey: z.string().min(1).max(200),
  employeeId: z.string().uuid(),
  matchMethod: z.enum(IDENTITY_MATCH_METHODS).optional(),
});

export const createBranchLinkSchema = z.object({
  connectionId: z.string().uuid(),
  externalBranchKey: z.string().min(1).max(200),
  branchId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
});

export const analyticsQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  branchId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  sourceConnectionId: z.string().uuid().optional(),
});

export const analyticsDrilldownSchema = z.object({
  metric: z.string().min(1).max(80),
  groupBy: z.enum(["employee", "branch", "day"]).default("employee"),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  branchId: z.string().uuid().optional(),
});

export const analyticsTimelineSchema = z.object({
  employeeId: z.string().uuid(),
  date: z.string().date(),
});

export const analyticsCorrelationSchema = z.object({
  x: z.string().min(1).max(80),
  y: z.string().min(1).max(80),
  periodDays: z.coerce.number().int().min(1).max(90).optional().default(30),
  branchId: z.string().uuid().optional(),
});

export const updateAlertSchema = z.object({
  status: z.enum(ANALYTICS_ALERT_STATUSES),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
export type CreateIntegrationConnectionInput = z.infer<
  typeof createIntegrationConnectionSchema
>;

export const leaveRequestDraftSchema = z.object({
  employeeId: z.string().uuid().optional(),
  leaveTypeId: z.string().min(1).max(80),
  startDate: z.string().date(),
  endDate: z.string().date(),
  requestedDays: z.number().min(0.5).max(365).nullable().optional(),
  partialDayType: z
    .enum(["full", "first_half", "second_half", "custom_hours"])
    .optional()
    .default("full"),
  customHours: z.number().min(0).max(24).nullable().optional(),
  urgency: z.enum(["planned", "emergency"]).optional().default("planned"),
  reason: z.string().trim().max(2000).optional().default(""),
  handoverNotes: z.string().trim().max(2000).optional().default(""),
  coverageEmployeeId: z.string().uuid().nullable().optional(),
  attachmentName: z.string().trim().max(240).nullable().optional(),
  attachments: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        name: z.string().trim().min(1).max(240),
        mime: z.string().trim().min(1).max(120),
        size: z.number().int().min(0).max(Math.floor(1.5 * 1024 * 1024)),
        dataUrl: z.string().min(1).max(2_200_000),
      }),
    )
    .max(3)
    .optional()
    .default([]),
  asDraft: z.boolean().optional().default(false),
});

export const leaveDecideSchema = z.object({
  decision: z.enum(["approved", "rejected", "returned"]),
  comment: z.string().trim().max(2000).optional().default(""),
});

export const leaveBulkDecideSchema = z.object({
  ids: z.array(z.string().min(1).max(80)).min(1).max(50),
  decision: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(2000).optional().default(""),
});

export const leaveCancelSchema = z.object({
  note: z.string().trim().max(2000).optional().default(""),
});

export const leaveCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  kind: z.enum(["employee", "approver", "hr_internal", "handover"]).optional(),
});

export const leaveHrNoteSchema = z.object({
  note: z.string().trim().max(4000),
});

export const leaveAdjustBalanceSchema = z.object({
  employeeId: z.string().uuid(),
  leaveTypeId: z.string().min(1).max(80),
  amount: z.number().min(-365).max(365),
  note: z.string().trim().min(1).max(500),
});

export type LeaveRequestDraftInput = z.infer<typeof leaveRequestDraftSchema>;
export type LeaveDecideInput = z.infer<typeof leaveDecideSchema>;
