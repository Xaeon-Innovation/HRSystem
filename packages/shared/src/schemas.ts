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
  NOTIFICATION_TYPES,
  PAYMOB_INTERVAL_DAYS,
  REVIEW_PERIODS,
  ROLES,
  SUBSCRIPTION_STATUSES,
  TENANT_STATUSES,
  CANONICAL_TARGET_ENTITIES,
  BRANCH_STATUSES,
  ANALYTICS_ALERT_STATUSES,
} from "./constants.js";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

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

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(TENANT_STATUSES).optional(),
  settings: z
    .object({
      brandingName: z.string().optional(),
      logoUrl: z.string().url().optional().nullable(),
      timezone: z.string().optional(),
      pingIntervalSec: z.number().int().min(15).max(30).optional(),
      locationRetentionDays: z.number().int().min(30).max(90).optional(),
      missedClockOutHours: z.number().positive().optional(),
      defaultHourlyCost: z.number().min(0).optional(),
      integrationRawRetentionDays: z.number().int().min(30).max(90).optional(),
      latenessGraceMinutes: z.number().int().min(0).max(180).optional(),
      shiftStartHour: z.number().int().min(0).max(23).optional(),
    })
    .partial()
    .optional(),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["tenant_admin", "employee"]).default("employee"),
  phone: z.string().max(40).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  status: z.enum(EMPLOYEE_STATUSES).default("active"),
  branchId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({
  email: true,
  password: true,
}).extend({
  phone: z.string().max(40).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  contactPhone: z.string().max(40).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  siteId: z.string().uuid().optional().nullable(),
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

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  roleFilter: z.enum(["tenant_admin", "employee"]).optional(),
});

export const jwtPayloadSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(ROLES),
  tenantId: z.string().uuid().nullable(),
  employeeId: z.string().uuid().nullable().optional(),
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
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ClockEventInput = z.infer<typeof clockEventSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type NotificationTypeInput = (typeof NOTIFICATION_TYPES)[number];
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type BillingCheckoutInput = z.infer<typeof billingCheckoutSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

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
