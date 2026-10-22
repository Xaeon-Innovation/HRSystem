import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, ilike, or } from "drizzle-orm";
import { branches, employees, sites, users } from "@hr/db";
import {
  createEmployeeSchema,
  importEmployeesBodySchema,
  normalizeSystemModuleRoles,
  setEmployeePasswordSchema,
  updateEmployeeSchema,
  draftToCreatePayload,
  isEmployeeDraftComplete,
  parseEmployeeCsv,
  type CreateEmployeeInput,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { avatarUrlFor } from "../lib/avatar.js";
import { assertSeatAvailable } from "../lib/billing.js";
import {
  assertJobRolesExist,
  loadJobRolesByEmployeeIds,
  replaceEmployeeJobRoles,
} from "../lib/job-roles.js";
import { requireRoles, tenantIdOf } from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";

function asDateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function emptyToNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function hashedLoginPassword(plain: string) {
  return {
    passwordHash: await bcrypt.hash(plain, 10),
  };
}

const employeeSelect = {
  id: employees.id,
  tenantId: employees.tenantId,
  phone: employees.phone,
  jobTitle: employees.jobTitle,
  nationalId: employees.nationalId,
  dateOfBirth: employees.dateOfBirth,
  address: employees.address,
  hireDate: employees.hireDate,
  emergencyContactName: employees.emergencyContactName,
  emergencyContactPhone: employees.emergencyContactPhone,
  status: employees.status,
  presenceMode: employees.presenceMode,
  branchId: employees.branchId,
  siteId: employees.siteId,
  managerId: employees.managerId,
  geofenceLat: employees.geofenceLat,
  geofenceLng: employees.geofenceLng,
  geofenceRadiusMeters: employees.geofenceRadiusMeters,
  userId: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  systemModuleRoles: users.systemModuleRoles,
  avatarMime: users.avatarMime,
  userUpdatedAt: users.updatedAt,
  createdAt: employees.createdAt,
};

function serializeEmployee<T extends Record<string, unknown>>(row: T) {
  const { avatarMime, userUpdatedAt, systemModuleRoles, ...rest } = row;
  const role = String(row.role ?? "employee");
  return {
    ...rest,
    dateOfBirth: asDateOnly(row.dateOfBirth),
    hireDate: asDateOnly(row.hireDate),
    systemModuleRoles:
      role === "tenant_admin" || role === "super_admin"
        ? []
        : normalizeSystemModuleRoles(
            Array.isArray(systemModuleRoles)
              ? (systemModuleRoles as string[])
              : [],
          ),
    avatarUrl: avatarUrlFor(
      String(row.userId ?? ""),
      typeof avatarMime === "string" ? avatarMime : null,
      userUpdatedAt as Date | string | null | undefined,
    ),
    jobRoles: Array.isArray(row.jobRoles) ? row.jobRoles : [],
  };
}

export const employeeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  async function resolveBranchId(
    tenantId: string,
    branchId: string | null | undefined,
    branchCode: string | null | undefined,
  ): Promise<string | null> {
    if (branchId) {
      const branch = await app.db.query.branches.findFirst({
        where: and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)),
      });
      if (!branch) throw new Error("Branch not found");
      return branch.id;
    }
    const code = branchCode?.trim();
    if (!code) return null;
    const branch = await app.db.query.branches.findFirst({
      where: and(eq(branches.tenantId, tenantId), eq(branches.code, code)),
    });
    if (!branch) throw new Error(`Unknown branch code: ${code}`);
    return branch.id;
  }

  async function resolveManagerId(
    tenantId: string,
    managerId: string | null | undefined,
    selfEmployeeId?: string,
  ): Promise<string | null | undefined> {
    if (managerId === undefined) return undefined;
    if (managerId == null) return null;
    if (selfEmployeeId && managerId === selfEmployeeId) {
      throw new Error("Employee cannot be their own manager");
    }
    const manager = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, managerId),
        eq(employees.tenantId, tenantId),
      ),
      columns: { id: true },
    });
    if (!manager) throw new Error("Manager not found in tenant");
    return manager.id;
  }

  async function insertEmployee(
    tenantId: string,
    data: CreateEmployeeInput,
  ) {
    const password =
      data.password ?? `Temp${Math.random().toString(36).slice(2, 10)}!`;
    const branchId = await resolveBranchId(
      tenantId,
      data.branchId,
      data.branchCode,
    );
    if (data.siteId) {
      const site = await app.db.query.sites.findFirst({
        where: and(eq(sites.id, data.siteId), eq(sites.tenantId, tenantId)),
      });
      if (!site) throw new Error("Site not found");
    }
    if (data.jobRoleIds?.length) {
      await assertJobRolesExist(app.db, tenantId, data.jobRoleIds);
    }
    const managerId = await resolveManagerId(tenantId, data.managerId);

    const existing = await app.db.query.users.findFirst({
      where: and(eq(users.email, data.email), eq(users.tenantId, tenantId)),
    });
    if (existing) throw new Error("Email already exists in tenant");

    const existingNid = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.tenantId, tenantId),
        eq(employees.nationalId, data.nationalId),
      ),
    });
    if (existingNid) throw new Error("National ID already exists in tenant");

    const hashed = await hashedLoginPassword(password);
    const [user] = await app.db
      .insert(users)
      .values({
        tenantId,
        email: data.email,
        name: data.name,
        role: data.role,
        systemModuleRoles:
          data.role === "tenant_admin"
            ? []
            : normalizeSystemModuleRoles(data.systemModuleRoles ?? []),
        passwordHash: hashed.passwordHash,
      })
      .returning();

    const [employee] = await app.db
      .insert(employees)
      .values({
        tenantId,
        userId: user.id,
        phone: data.phone,
        jobTitle: data.jobTitle,
        nationalId: data.nationalId,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        hireDate: data.hireDate,
        emergencyContactName: emptyToNull(data.emergencyContactName) ?? null,
        emergencyContactPhone: emptyToNull(data.emergencyContactPhone) ?? null,
        status: data.status,
        presenceMode: data.presenceMode ?? "fixed_zone",
        branchId,
        siteId: data.siteId ?? null,
        managerId: managerId ?? null,
        geofenceLat:
          data.presenceMode === "mobile" ? null : (data.geofenceLat ?? null),
        geofenceLng:
          data.presenceMode === "mobile" ? null : (data.geofenceLng ?? null),
        geofenceRadiusMeters:
          data.presenceMode === "mobile"
            ? null
            : (data.geofenceRadiusMeters ?? null),
      })
      .returning();

    const assigned =
      data.jobRoleIds && data.jobRoleIds.length > 0
        ? await replaceEmployeeJobRoles(
            app.db,
            tenantId,
            employee.id,
            data.jobRoleIds,
          )
        : [];

    return {
      employee: serializeEmployee({
        ...employee,
        name: user.name,
        email: user.email,
        role: user.role,
        systemModuleRoles: user.systemModuleRoles,
        jobRoles: assigned,
      }),
      temporaryPassword: data.password ? undefined : password,
    };
  }

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const q = (request.query as { q?: string; status?: string }).q;
    const status = (request.query as { status?: string }).status;

    const rows = await app.db
      .select(employeeSelect)
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          status
            ? eq(employees.status, status as "active" | "inactive")
            : undefined,
          q
            ? or(
                ilike(users.name, `%${q}%`),
                ilike(users.email, `%${q}%`),
                ilike(employees.jobTitle, `%${q}%`),
                ilike(employees.phone, `%${q}%`),
                ilike(employees.nationalId, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(users.name);

    const rolesByEmployee = await loadJobRolesByEmployeeIds(
      app.db,
      tenantId,
      rows.map((row) => row.id),
    );

    return {
      employees: rows.map((row) =>
        serializeEmployee({
          ...row,
          jobRoles: rolesByEmployee.get(row.id) ?? [],
        }),
      ),
    };
  });

  /** Lightweight count of direct reports for nav gating. */
  app.get("/managed", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    if (!user.employeeId) {
      return { count: 0 };
    }
    const rows = await app.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.managerId, user.employeeId),
          eq(employees.status, "active"),
        ),
      );
    return { count: rows.length };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const data = parsed.data;

      if (data.status !== "inactive") {
        const seats = await assertSeatAvailable(app.db, tenantId, 1);
        if (!seats.ok) {
          return reply.code(403).send({ error: seats.error });
        }
      }

      try {
        const created = await insertEmployee(tenantId, data);
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "employee.create",
          tenantId,
          resourceType: "employee",
          resourceId: created.employee.id as string,
          metadata: { email: created.employee.email, role: created.employee.role },
          request,
        });
        return reply.code(201).send(created);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed";
        const code =
          message.includes("already exists") || message.includes("not found")
            ? message.includes("already exists")
              ? 409
              : 400
            : 400;
        return reply.code(code).send({ error: message });
      }
    },
  );

  app.post(
    "/import",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = importEmployeesBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      let payloads: CreateEmployeeInput[] = [];

      if (parsed.data.employees?.length) {
        payloads = parsed.data.employees;
      } else if (parsed.data.csv) {
        const preview = parseEmployeeCsv(parsed.data.csv);
        if (preview.rows.length === 0) {
          return reply.code(400).send({ error: "CSV needs header + rows" });
        }
        const incomplete = preview.rows.filter(
          (row) => !isEmployeeDraftComplete(row.data),
        );
        if (incomplete.length > 0) {
          return reply.code(422).send({
            imported: false,
            error:
              "Fill missing employee information before adding them to the system",
            incomplete: incomplete.map((row) => ({
              line: row.line,
              missing: row.missing,
              errors: row.errors,
              data: row.data,
            })),
            readyCount: preview.rows.length - incomplete.length,
          });
        }
        const converted = [];
        for (const row of preview.rows) {
          const candidate = createEmployeeSchema.safeParse(
            draftToCreatePayload(row.data),
          );
          if (!candidate.success) {
            return reply.code(422).send({
              imported: false,
              error:
                "Fill missing employee information before adding them to the system",
              incomplete: [
                {
                  line: row.line,
                  missing: row.missing,
                  errors: candidate.error.issues.map((issue) => ({
                    field: String(issue.path[0] ?? "row"),
                    message: issue.message,
                  })),
                  data: row.data,
                },
              ],
            });
          }
          converted.push(candidate.data);
        }
        payloads = converted;
      }

      const created: unknown[] = [];
      const errors: { index: number; error: string }[] = [];
      let pendingSeats = 0;

      for (let i = 0; i < payloads.length; i++) {
        const data = payloads[i];
        try {
          if (data.status !== "inactive") {
            const seats = await assertSeatAvailable(
              app.db,
              tenantId,
              pendingSeats + 1,
            );
            if (!seats.ok) {
              errors.push({ index: i, error: seats.error });
              continue;
            }
          }
          const result = await insertEmployee(tenantId, data);
          created.push({
            id: result.employee.id,
            email: result.employee.email,
            name: result.employee.name,
            temporaryPassword: result.temporaryPassword,
          });
          if (data.status !== "inactive") pendingSeats += 1;
        } catch (e) {
          errors.push({
            index: i,
            error: e instanceof Error ? e.message : "failed",
          });
        }
      }

      if (created.length > 0) {
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "employee.import",
          tenantId,
          resourceType: "employee",
          resourceId: tenantId,
          metadata: { created: created.length, errors: errors.length },
          request,
        });
      }

      return { created, errors };
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateEmployeeSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const emp = await app.db.query.employees.findFirst({
        where: and(eq(employees.id, id), eq(employees.tenantId, tenantId)),
      });
      if (!emp) return reply.code(404).send({ error: "Not found" });

      const nextStatus = parsed.data.status ?? emp.status;
      if (emp.status !== "active" && nextStatus === "active") {
        const seats = await assertSeatAvailable(app.db, tenantId, 1);
        if (!seats.ok) {
          return reply.code(403).send({ error: seats.error });
        }
      }

      let nextBranchId =
        parsed.data.branchId === undefined ? emp.branchId : parsed.data.branchId;
      let nextSiteId =
        parsed.data.siteId === undefined ? emp.siteId : parsed.data.siteId;
      if (nextBranchId) {
        const branch = await app.db.query.branches.findFirst({
          where: and(
            eq(branches.id, nextBranchId),
            eq(branches.tenantId, tenantId),
          ),
        });
        if (!branch) return reply.code(400).send({ error: "Branch not found" });
      }
      if (nextSiteId) {
        const site = await app.db.query.sites.findFirst({
          where: and(eq(sites.id, nextSiteId), eq(sites.tenantId, tenantId)),
        });
        if (!site) return reply.code(400).send({ error: "Site not found" });
        if (nextBranchId && site.branchId !== nextBranchId) {
          return reply
            .code(400)
            .send({ error: "Site does not belong to the selected branch" });
        }
        if (!nextBranchId) nextBranchId = site.branchId;
      }

      let nextManagerId: string | null = emp.managerId;
      if (parsed.data.managerId !== undefined) {
        try {
          nextManagerId =
            (await resolveManagerId(
              tenantId,
              parsed.data.managerId,
              id,
            )) ?? null;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid manager";
          return reply.code(400).send({ error: message });
        }
      }

      if (parsed.data.nationalId) {
        const clash = await app.db.query.employees.findFirst({
          where: and(
            eq(employees.tenantId, tenantId),
            eq(employees.nationalId, parsed.data.nationalId),
          ),
        });
        if (clash && clash.id !== emp.id) {
          return reply
            .code(409)
            .send({ error: "National ID already exists in tenant" });
        }
      }

      const clearingGeofence =
        parsed.data.geofenceLat === null &&
        parsed.data.geofenceLng === null &&
        parsed.data.geofenceRadiusMeters === null;
      const nextPresenceMode =
        parsed.data.presenceMode !== undefined
          ? parsed.data.presenceMode
          : emp.presenceMode ?? "fixed_zone";
      let nextGeofenceLat = clearingGeofence
        ? null
        : parsed.data.geofenceLat !== undefined
          ? parsed.data.geofenceLat
          : emp.geofenceLat;
      let nextGeofenceLng = clearingGeofence
        ? null
        : parsed.data.geofenceLng !== undefined
          ? parsed.data.geofenceLng
          : emp.geofenceLng;
      let nextGeofenceRadius = clearingGeofence
        ? null
        : parsed.data.geofenceRadiusMeters !== undefined
          ? parsed.data.geofenceRadiusMeters
          : emp.geofenceRadiusMeters;
      if (nextPresenceMode === "mobile") {
        nextGeofenceLat = null;
        nextGeofenceLng = null;
        nextGeofenceRadius = null;
      }

      const user = await app.db.query.users.findFirst({
        where: eq(users.id, emp.userId),
      });
      if (!user) return reply.code(404).send({ error: "Not found" });

      const nextEmail = parsed.data.email?.trim().toLowerCase();
      if (nextEmail && nextEmail !== user.email) {
        const emailClash = await app.db.query.users.findFirst({
          where: and(eq(users.email, nextEmail), eq(users.tenantId, tenantId)),
        });
        if (emailClash) {
          return reply.code(409).send({ error: "Email already exists in tenant" });
        }
      }

      const [updated] = await app.db
        .update(employees)
        .set({
          phone:
            parsed.data.phone !== undefined ? parsed.data.phone : emp.phone,
          jobTitle:
            parsed.data.jobTitle !== undefined
              ? parsed.data.jobTitle
              : emp.jobTitle,
          nationalId:
            parsed.data.nationalId !== undefined
              ? parsed.data.nationalId
              : emp.nationalId,
          dateOfBirth:
            parsed.data.dateOfBirth !== undefined
              ? parsed.data.dateOfBirth
              : emp.dateOfBirth,
          address:
            parsed.data.address !== undefined
              ? parsed.data.address
              : emp.address,
          hireDate:
            parsed.data.hireDate !== undefined
              ? parsed.data.hireDate
              : emp.hireDate,
          emergencyContactName:
            parsed.data.emergencyContactName !== undefined
              ? emptyToNull(parsed.data.emergencyContactName) ?? null
              : emp.emergencyContactName,
          emergencyContactPhone:
            parsed.data.emergencyContactPhone !== undefined
              ? emptyToNull(parsed.data.emergencyContactPhone) ?? null
              : emp.emergencyContactPhone,
          status: nextStatus,
          presenceMode: nextPresenceMode,
          branchId: nextBranchId,
          siteId: nextSiteId,
          managerId: nextManagerId,
          geofenceLat: nextGeofenceLat,
          geofenceLng: nextGeofenceLng,
          geofenceRadiusMeters: nextGeofenceRadius,
          updatedAt: new Date(),
        })
        .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
        .returning();

      if (parsed.data.jobRoleIds) {
        try {
          await replaceEmployeeJobRoles(
            app.db,
            tenantId,
            id,
            parsed.data.jobRoleIds,
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed";
          return reply.code(400).send({ error: message });
        }
      }

      if (
        parsed.data.name ||
        parsed.data.role ||
        parsed.data.systemModuleRoles ||
        (nextEmail && nextEmail !== user.email)
      ) {
        const nextRole = parsed.data.role ?? user.role;
        const nextModules =
          nextRole === "tenant_admin"
            ? []
            : parsed.data.systemModuleRoles !== undefined
              ? normalizeSystemModuleRoles(parsed.data.systemModuleRoles)
              : normalizeSystemModuleRoles(
                  Array.isArray(user.systemModuleRoles)
                    ? user.systemModuleRoles
                    : [],
                );
        await app.db
          .update(users)
          .set({
            ...(parsed.data.name ? { name: parsed.data.name } : {}),
            ...(parsed.data.role ? { role: parsed.data.role } : {}),
            ...(parsed.data.systemModuleRoles !== undefined ||
            parsed.data.role === "tenant_admin"
              ? { systemModuleRoles: nextModules }
              : {}),
            ...(nextEmail && nextEmail !== user.email ? { email: nextEmail } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.id, emp.userId));
      }

      const actor = request.user as JwtPayload;
      const action =
        emp.status !== "inactive" && updated.status === "inactive"
          ? "employee.deactivate"
          : "employee.update";
      await writeAudit(app, {
        actor,
        action,
        tenantId,
        resourceType: "employee",
        resourceId: updated.id,
        metadata: {
          before: { status: emp.status, phone: emp.phone, jobTitle: emp.jobTitle },
          after: {
            status: updated.status,
            phone: updated.phone,
            jobTitle: updated.jobTitle,
            name: parsed.data.name,
          },
        },
        request,
      });

      const rows = await app.db
        .select(employeeSelect)
        .from(employees)
        .innerJoin(users, eq(users.id, employees.userId))
        .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
        .limit(1);
      const rolesByEmployee = await loadJobRolesByEmployeeIds(app.db, tenantId, [
        id,
      ]);

      return {
        employee: serializeEmployee({
          ...(rows[0] ?? updated),
          jobRoles: rolesByEmployee.get(id) ?? [],
        }),
      };
    },
  );

  app.get(
    "/:id/credentials",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const emp = await app.db.query.employees.findFirst({
        where: and(eq(employees.id, id), eq(employees.tenantId, tenantId)),
      });
      if (!emp) return reply.code(404).send({ error: "Not found" });
      const user = await app.db.query.users.findFirst({
        where: eq(users.id, emp.userId),
      });
      if (!user) return reply.code(404).send({ error: "Not found" });
      return {
        email: user.email,
      };
    },
  );

  app.post(
    "/:id/password",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = setEmployeePasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const emp = await app.db.query.employees.findFirst({
        where: and(eq(employees.id, id), eq(employees.tenantId, tenantId)),
      });
      if (!emp) return reply.code(404).send({ error: "Not found" });
      const user = await app.db.query.users.findFirst({
        where: eq(users.id, emp.userId),
      });
      if (!user) return reply.code(404).send({ error: "Not found" });

      const nextPassword = parsed.data.password;
      const hashed = await hashedLoginPassword(nextPassword);
      await app.db
        .update(users)
        .set({
          passwordHash: hashed.passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "employee.password.change",
        tenantId,
        resourceType: "employee",
        resourceId: emp.id,
        metadata: { email: user.email },
        request,
      });

      return { email: user.email, password: nextPassword };
    },
  );

  app.get("/:id", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const rows = await app.db
      .select(employeeSelect)
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "Not found" });
    const rolesByEmployee = await loadJobRolesByEmployeeIds(app.db, tenantId, [
      id,
    ]);
    return {
      employee: serializeEmployee({
        ...rows[0],
        jobRoles: rolesByEmployee.get(id) ?? [],
      }),
    };
  });
};
