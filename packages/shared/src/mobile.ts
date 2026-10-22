import { z } from "zod";
import { PRESENCE_MODES, TASK_PRIORITIES, TASK_STATUSES } from "./constants.js";
import { LEAVE_REQUEST_STATUSES, PARTIAL_DAY_TYPES } from "./leave/types.js";
import { MODULE_KEYS } from "./modules.js";

/** Sync entity envelope fields shared by pull upserts. */
export const syncEntityMetaSchema = z.object({
  id: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  version: z.number().int().nonnegative().default(1),
  deletedAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const mobileZoneSchema = z.object({
  id: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().positive(),
  label: z.string().optional(),
});

export const mobileEntitlementsSchema = z.object({
  fieldOps: z.boolean(),
  liveMap: z.boolean(),
  teamToday: z.boolean(),
  leave: z.boolean(),
  tasks: z.boolean(),
  kpis: z.boolean().optional(),
  modules: z.record(z.enum(MODULE_KEYS), z.boolean()).optional(),
});

export const mobileMeSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
    avatarUrl: z.string().nullable().optional(),
    employeeId: z.string().uuid().nullable(),
  }),
  tenant: z.object({
    id: z.string().uuid(),
    slug: z.string(),
    name: z.string(),
    logoUrl: z.string().nullable().optional(),
    accentPreset: z
      .enum(["lime", "teal", "emerald", "violet"])
      .default("lime"),
    timezone: z.string().default("UTC"),
  }),
  role: z.string(),
  moduleRoles: z.array(z.string()),
  presenceMode: z.enum(PRESENCE_MODES),
  zones: z.array(mobileZoneSchema),
  entitlements: mobileEntitlementsSchema,
  locale: z.enum(["en", "ar"]).default("en"),
  theme: z.enum(["system", "light", "dark"]).default("system"),
  managerOf: z.number().int().nonnegative().default(0),
  mustChangePassword: z.boolean().optional(),
});

export type MobileMe = z.infer<typeof mobileMeSchema>;
export type MobileZone = z.infer<typeof mobileZoneSchema>;
export type MobileEntitlements = z.infer<typeof mobileEntitlementsSchema>;

/** Location captured with an outbox event. */
export const mobileEventLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().nonnegative(),
  mocked: z.boolean().optional(),
  at: z.string().datetime({ offset: true }),
});

const baseEventFields = {
  id: z.string().uuid(),
  occurredAt: z.string().datetime({ offset: true }),
  deviceUptimeMs: z.number().nonnegative(),
  capturedOffline: z.boolean(),
  location: mobileEventLocationSchema.optional(),
  baseVersion: z.number().int().nonnegative().optional(),
};

export const mobileOutboxEventSchema = z.discriminatedUnion("type", [
  z.object({ ...baseEventFields, type: z.literal("clock.in") }),
  z.object({ ...baseEventFields, type: z.literal("clock.out") }),
  z.object({ ...baseEventFields, type: z.literal("break.start") }),
  z.object({ ...baseEventFields, type: z.literal("break.end") }),
  z.object({ ...baseEventFields, type: z.literal("overtime.stay") }),
  z.object({ ...baseEventFields, type: z.literal("overtime.decline") }),
  z.object({
    ...baseEventFields,
    type: z.literal("zone.exit"),
    duringBreak: z.boolean().optional(),
  }),
  z.object({ ...baseEventFields, type: z.literal("zone.enter") }),
  z.object({
    ...baseEventFields,
    type: z.literal("leave.create"),
    payload: z.object({
      typeId: z.string().min(1),
      startDate: z.string().min(1),
      endDate: z.string().min(1),
      partialDay: z.enum(PARTIAL_DAY_TYPES).optional(),
      urgency: z.enum(["planned", "emergency"]).optional(),
      note: z.string().optional(),
      uploadId: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("leave.cancel"),
    payload: z.object({ requestId: z.string().min(1) }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("leave.resubmit"),
    payload: z.object({
      requestId: z.string().min(1),
      note: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("leave.decide"),
    payload: z.object({
      requestId: z.string().min(1),
      decision: z.enum(["approve", "reject", "return"]),
      note: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("task.status"),
    payload: z.object({
      taskId: z.string().uuid(),
      status: z.enum(TASK_STATUSES),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("task.comment"),
    payload: z.object({
      taskId: z.string().uuid(),
      body: z.string().min(1),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("task.deliverable.link"),
    payload: z.object({
      taskId: z.string().uuid(),
      url: z.string().url(),
      name: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("task.deliverable.file"),
    payload: z.object({
      taskId: z.string().uuid(),
      uploadId: z.string().min(1),
      name: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("task.review"),
    payload: z.object({
      taskId: z.string().uuid(),
      decision: z.enum(["accept", "request_changes"]),
      note: z.string().optional(),
    }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("notification.read"),
    payload: z.object({ notificationId: z.string().uuid() }),
  }),
  z.object({
    ...baseEventFields,
    type: z.literal("notification.readAll"),
  }),
]);

export type MobileOutboxEvent = z.infer<typeof mobileOutboxEventSchema>;

export const mobilePushResultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["applied", "duplicate", "rejected", "conflict"]),
  reason: z.string().optional(),
  serverRecord: z.unknown().optional(),
  serverTime: z.string().datetime({ offset: true }),
});

export type MobilePushResult = z.infer<typeof mobilePushResultSchema>;

export const mobileSyncPushBodySchema = z.object({
  events: z.array(mobileOutboxEventSchema).min(1).max(100),
});

export const mobileLocationPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().nonnegative().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  at: z.string().datetime({ offset: true }),
  mocked: z.boolean().optional(),
  clientPingId: z.string().uuid().optional(),
});

export const mobileLocationsBatchSchema = z.object({
  points: z.array(mobileLocationPointSchema).min(1).max(500),
});

export type MobileLocationsBatch = z.infer<typeof mobileLocationsBatchSchema>;

/** Lightweight sync DTOs — server may send richer records; clients store these. */
export const mobileShiftInstanceSchema = syncEntityMetaSchema.extend({
  employeeId: z.string().uuid(),
  workDate: z.string(),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  status: z.string(),
  lateClockIn: z.boolean().optional(),
  overtimeStatus: z.string().optional(),
});

export const mobileClockSessionSchema = syncEntityMetaSchema.extend({
  employeeId: z.string().uuid(),
  clockInAt: z.string().datetime({ offset: true }),
  clockOutAt: z.string().datetime({ offset: true }).nullable(),
  source: z.enum(["web", "mobile", "mobile_offline"]).optional(),
  anomalyFlags: z.array(z.string()).optional(),
});

export const mobileLeaveRequestSchema = syncEntityMetaSchema.extend({
  status: z.enum(LEAVE_REQUEST_STATUSES),
  typeId: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export const mobileTaskSchema = syncEntityMetaSchema.extend({
  title: z.string(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const mobileNotificationSchema = syncEntityMetaSchema
  .omit({ version: true })
  .extend({
    type: z.string(),
    title: z.string(),
    body: z.string(),
    read: z.boolean(),
    category: z.string().nullable().optional(),
  });

export const mobileSyncChangesSchema = z.object({
  shiftInstances: z
    .object({
      upserts: z.array(mobileShiftInstanceSchema).default([]),
      deletes: z.array(z.string()).default([]),
    })
    .optional(),
  clockSessions: z
    .object({
      upserts: z.array(mobileClockSessionSchema).default([]),
      deletes: z.array(z.string()).default([]),
    })
    .optional(),
  leaveRequests: z
    .object({
      upserts: z.array(mobileLeaveRequestSchema).default([]),
      deletes: z.array(z.string()).default([]),
    })
    .optional(),
  tasks: z
    .object({
      upserts: z.array(mobileTaskSchema).default([]),
      deletes: z.array(z.string()).default([]),
    })
    .optional(),
  notifications: z
    .object({
      upserts: z.array(mobileNotificationSchema).default([]),
      deletes: z.array(z.string()).default([]),
    })
    .optional(),
});

export const mobileSyncPullResponseSchema = z.object({
  changes: mobileSyncChangesSchema,
  cursor: z.string(),
  serverTime: z.string().datetime({ offset: true }),
});

export type MobileSyncPullResponse = z.infer<
  typeof mobileSyncPullResponseSchema
>;

export const mobileSyncPushResponseSchema = z.object({
  results: z.array(mobilePushResultSchema),
  serverTime: z.string().datetime({ offset: true }),
});

export const mobileWorkspaceRequestSchema = z.object({
  slug: z.string().min(1).max(64),
});

export const mobileWorkspaceResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  logoUrl: z.string().nullable().optional(),
  accentPreset: z.enum(["lime", "teal", "emerald", "violet"]).default("lime"),
  status: z.enum(["active", "suspended"]),
  signInMethods: z.array(z.enum(["password"])).default(["password"]),
});

export const mobileDeviceSchema = z.object({
  id: z.string().uuid(),
  platform: z.enum(["ios", "android"]),
  model: z.string().optional(),
  appVersion: z.string().optional(),
});

export const mobileLoginRequestSchema = z.object({
  slug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  device: mobileDeviceSchema,
});

export const mobileRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
  deviceId: z.string().uuid(),
});

export const mobileChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export const mobileLogoutRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
  deviceId: z.string().uuid(),
});

export type MobileDevice = z.infer<typeof mobileDeviceSchema>;
export type MobileLoginRequest = z.infer<typeof mobileLoginRequestSchema>;
export type MobileRefreshRequest = z.infer<typeof mobileRefreshRequestSchema>;
export type MobileChangePasswordInput = z.infer<
  typeof mobileChangePasswordSchema
>;
export type MobileLogoutRequest = z.infer<typeof mobileLogoutRequestSchema>;
export type MobileWorkspaceResponse = z.infer<
  typeof mobileWorkspaceResponseSchema
>;

export const mobileUploadRequestSchema = z.object({
  fileName: z.string().min(1).max(240),
  mime: z.string().min(1).max(120),
  size: z.number().int().positive().max(2_200_000),
  purpose: z.enum(["leave-attachment", "task-deliverable"]),
  dataUrl: z.string().min(1).max(2_200_000),
});

export type MobileUploadRequest = z.infer<typeof mobileUploadRequestSchema>;
