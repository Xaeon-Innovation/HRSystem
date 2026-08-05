import { z } from "zod";
import {
  EMPLOYEE_STATUSES,
  KPI_TYPES,
  NOTIFICATION_TYPES,
  REVIEW_PERIODS,
  ROLES,
  TENANT_STATUSES,
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
});

export const updateEmployeeSchema = createEmployeeSchema.partial().omit({
  email: true,
  password: true,
}).extend({
  phone: z.string().max(40).optional().nullable(),
  jobTitle: z.string().max(120).optional().nullable(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  contactPhone: z.string().max(40).optional().nullable(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type ClockEventInput = z.infer<typeof clockEventSchema>;
export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
export type NotificationTypeInput = (typeof NOTIFICATION_TYPES)[number];
