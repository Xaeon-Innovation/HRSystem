import type { FastifyPluginAsync } from "fastify";
import { and, count, eq, ne, or, sql } from "drizzle-orm";
import {
  alertRules,
  branches,
  employees,
  jobRoles,
  shiftPatterns,
  skills,
  tenants,
  users,
  type TenantSettings,
} from "@hr/db";
import { z } from "zod";
import { authenticate, requireRoles, tenantIdOf } from "../types.js";

const patchSchema = z
  .object({
    leaveReviewed: z.boolean().optional(),
    alertsReviewed: z.boolean().optional(),
    dismissed: z.boolean().optional(),
  })
  .refine(
    (b) =>
      b.leaveReviewed !== undefined ||
      b.alertsReviewed !== undefined ||
      b.dismissed !== undefined,
    { message: "At least one field required" },
  );

type StepId =
  | "branding"
  | "branches"
  | "job_roles"
  | "skills"
  | "employees"
  | "presence"
  | "shifts"
  | "leave"
  | "alerts";

type SetupStep = {
  id: StepId;
  done: boolean;
  required: boolean;
  href: string;
  count?: number;
};

export const setupStatusRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/setup-status",
    {
      preHandler: [authenticate, requireRoles("tenant_admin")],
    },
    async (request) => {
      const tenantId = tenantIdOf(request);

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      const settings: TenantSettings = tenant?.settings ?? {};
      const checklist = settings.setupChecklist ?? {};

      const [branchRow] = await app.db
        .select({ value: count() })
        .from(branches)
        .where(eq(branches.tenantId, tenantId));

      const [roleRow] = await app.db
        .select({ value: count() })
        .from(jobRoles)
        .where(eq(jobRoles.tenantId, tenantId));

      const [skillRow] = await app.db
        .select({ value: count() })
        .from(skills)
        .where(eq(skills.tenantId, tenantId));

      const [employeeRow] = await app.db
        .select({ value: count() })
        .from(employees)
        .where(eq(employees.tenantId, tenantId));

      const [patternRow] = await app.db
        .select({ value: count() })
        .from(shiftPatterns)
        .where(
          and(
            eq(shiftPatterns.tenantId, tenantId),
            eq(shiftPatterns.active, true),
          ),
        );

      const [customAlertRow] = await app.db
        .select({ value: count() })
        .from(alertRules)
        .where(
          and(
            eq(alertRules.tenantId, tenantId),
            eq(alertRules.kind, "custom"),
            eq(alertRules.enabled, true),
          ),
        );

      // Non-admin employees missing both mobile presence and a geofence.
      const unsetPresence = await app.db
        .select({ id: employees.id })
        .from(employees)
        .innerJoin(users, eq(employees.userId, users.id))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            ne(users.role, "tenant_admin"),
            ne(users.role, "super_admin"),
            ne(employees.presenceMode, "mobile"),
            or(
              sql`${employees.geofenceLat} is null`,
              sql`${employees.geofenceLng} is null`,
              sql`${employees.geofenceRadiusMeters} is null`,
            ),
          ),
        )
        .limit(1);

      const nonAdminEmployees = await app.db
        .select({ value: count() })
        .from(employees)
        .innerJoin(users, eq(employees.userId, users.id))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            ne(users.role, "tenant_admin"),
            ne(users.role, "super_admin"),
          ),
        );

      const nonAdminCount = Number(nonAdminEmployees[0]?.value ?? 0);
      const presenceDone =
        nonAdminCount > 0 && unsetPresence.length === 0;

      const branchCount = Number(branchRow?.value ?? 0);
      const roleCount = Number(roleRow?.value ?? 0);
      const skillCount = Number(skillRow?.value ?? 0);
      const employeeCount = Number(employeeRow?.value ?? 0);
      const patternCount = Number(patternRow?.value ?? 0);
      const customAlertCount = Number(customAlertRow?.value ?? 0);

      const hasLogo = Boolean(tenant?.logoMime);
      const preset = settings.brandPreset ?? "neutral";
      const name = settings.brandingName?.trim() ?? "";
      const tenantName = tenant?.name?.trim() ?? "";
      const brandingDone =
        hasLogo ||
        preset !== "neutral" ||
        (name.length > 0 &&
          name !== tenantName &&
          name !== "HR Track" &&
          name !== "Polara");

      const leaveDone = Boolean(checklist.leaveReviewedAt);
      const alertsDone =
        Boolean(checklist.alertsReviewedAt) || customAlertCount > 0;

      const steps: SetupStep[] = [
        {
          id: "branding",
          done: brandingDone,
          required: true,
          href: "/app/settings?branding=1",
        },
        {
          id: "branches",
          done: branchCount > 0,
          required: true,
          href: "/app/settings/org",
          count: branchCount,
        },
        {
          id: "job_roles",
          done: roleCount > 0,
          required: true,
          href: "/app/settings/org",
          count: roleCount,
        },
        {
          id: "skills",
          done: skillCount > 0,
          required: true,
          href: "/app/settings/org",
          count: skillCount,
        },
        {
          id: "employees",
          done: employeeCount > 1,
          required: true,
          href: "/app/employees",
          count: employeeCount,
        },
        {
          id: "presence",
          done: presenceDone,
          required: true,
          href: "/app/employees",
          count: nonAdminCount,
        },
        {
          id: "shifts",
          done: patternCount > 0,
          required: true,
          href: "/app/shifts",
          count: patternCount,
        },
        {
          id: "leave",
          done: leaveDone,
          required: true,
          href: "/app/leave/policies",
        },
        {
          id: "alerts",
          done: alertsDone,
          required: false,
          href: "/app/notifications",
          count: customAlertCount,
        },
      ];

      const required = steps.filter((s) => s.required);
      const doneRequired = required.filter((s) => s.done).length;
      const allRequiredDone =
        required.length > 0 && doneRequired === required.length;
      const doneAll = steps.filter((s) => s.done).length;

      return {
        dismissed: Boolean(checklist.dismissedAt),
        steps,
        progress: {
          doneRequired,
          totalRequired: required.length,
          doneAll,
          totalAll: steps.length,
          pct:
            required.length === 0
              ? 100
              : Math.round((doneRequired / required.length) * 100),
          allRequiredDone,
        },
      };
    },
  );

  app.patch(
    "/setup-checklist",
    {
      preHandler: [authenticate, requireRoles("tenant_admin")],
    },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = patchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) return reply.code(404).send({ error: "Not found" });

      const prev = tenant.settings?.setupChecklist ?? {};
      const now = new Date().toISOString();
      const next: NonNullable<TenantSettings["setupChecklist"]> = { ...prev };

      if (parsed.data.leaveReviewed === true) {
        next.leaveReviewedAt = now;
      }
      if (parsed.data.alertsReviewed === true) {
        next.alertsReviewedAt = now;
      }
      if (parsed.data.dismissed === true) {
        next.dismissedAt = now;
      } else if (parsed.data.dismissed === false) {
        delete next.dismissedAt;
      }

      await app.db
        .update(tenants)
        .set({
          settings: {
            ...tenant.settings,
            setupChecklist: next,
          },
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      return { setupChecklist: next };
    },
  );
};
