import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, ilike, or } from "drizzle-orm";
import { branches, employees, sites, users } from "@hr/db";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { assertSeatAvailable } from "../lib/billing.js";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

export const employeeRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const q = (request.query as { q?: string; status?: string }).q;
    const status = (request.query as { status?: string }).status;

    const rows = await app.db
      .select({
        id: employees.id,
        tenantId: employees.tenantId,
        phone: employees.phone,
        jobTitle: employees.jobTitle,
        status: employees.status,
        branchId: employees.branchId,
        siteId: employees.siteId,
        userId: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: employees.createdAt,
      })
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
              )
            : undefined,
        ),
      )
      .orderBy(users.name);

    return { employees: rows };
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
      const password = data.password ?? `Temp${Math.random().toString(36).slice(2, 10)}!`;

      if (data.status !== "inactive") {
        const seats = await assertSeatAvailable(app.db, tenantId, 1);
        if (!seats.ok) {
          return reply.code(403).send({ error: seats.error });
        }
      }

      const existing = await app.db.query.users.findFirst({
        where: and(eq(users.email, data.email), eq(users.tenantId, tenantId)),
      });
      if (existing) {
        return reply.code(409).send({ error: "Email already exists in tenant" });
      }

      if (data.branchId) {
        const branch = await app.db.query.branches.findFirst({
          where: and(
            eq(branches.id, data.branchId),
            eq(branches.tenantId, tenantId),
          ),
        });
        if (!branch) return reply.code(400).send({ error: "Branch not found" });
      }
      if (data.siteId) {
        const site = await app.db.query.sites.findFirst({
          where: and(eq(sites.id, data.siteId), eq(sites.tenantId, tenantId)),
        });
        if (!site) return reply.code(400).send({ error: "Site not found" });
      }

      const [user] = await app.db
        .insert(users)
        .values({
          tenantId,
          email: data.email,
          name: data.name,
          role: data.role,
          passwordHash: await bcrypt.hash(password, 10),
        })
        .returning();

      const [employee] = await app.db
        .insert(employees)
        .values({
          tenantId,
          userId: user.id,
          phone: data.phone ?? null,
          jobTitle: data.jobTitle ?? null,
          status: data.status,
          branchId: data.branchId ?? null,
          siteId: data.siteId ?? null,
        })
        .returning();

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "employee.create",
        tenantId,
        resourceType: "employee",
        resourceId: employee.id,
        metadata: { email: user.email, role: user.role },
        request,
      });

      return reply.code(201).send({
        employee: { ...employee, name: user.name, email: user.email, role: user.role },
        temporaryPassword: data.password ? undefined : password,
      });
    },
  );

  app.post(
    "/import",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const body = request.body as { csv?: string };
      if (!body.csv) return reply.code(400).send({ error: "csv required" });

      const lines = body.csv
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        return reply.code(400).send({ error: "CSV needs header + rows" });
      }
      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf("name");
      const emailIdx = header.indexOf("email");
      const roleIdx = header.indexOf("role");
      const titleIdx = header.indexOf("jobtitle");
      if (nameIdx < 0 || emailIdx < 0) {
        return reply.code(400).send({ error: "CSV must include name,email" });
      }

      const created: unknown[] = [];
      const errors: { line: number; error: string }[] = [];
      let pendingSeats = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const name = cols[nameIdx];
        const email = cols[emailIdx];
        const role =
          roleIdx >= 0 && cols[roleIdx] === "tenant_admin"
            ? "tenant_admin"
            : "employee";
        const jobTitle = titleIdx >= 0 ? cols[titleIdx] : null;
        try {
          const seats = await assertSeatAvailable(
            app.db,
            tenantId,
            pendingSeats + 1,
          );
          if (!seats.ok) {
            errors.push({ line: i + 1, error: seats.error });
            continue;
          }
          const password = `Temp${Math.random().toString(36).slice(2, 10)}!`;
          const [user] = await app.db
            .insert(users)
            .values({
              tenantId,
              email,
              name,
              role,
              passwordHash: await bcrypt.hash(password, 10),
            })
            .returning();
          const [employee] = await app.db
            .insert(employees)
            .values({
              tenantId,
              userId: user.id,
              jobTitle,
              status: "active",
            })
            .returning();
          created.push({ id: employee.id, email, temporaryPassword: password });
          pendingSeats += 1;
        } catch (e) {
          errors.push({
            line: i + 1,
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

      const [updated] = await app.db
        .update(employees)
        .set({
          phone: parsed.data.phone ?? emp.phone,
          jobTitle: parsed.data.jobTitle ?? emp.jobTitle,
          status: nextStatus,
          branchId: nextBranchId,
          siteId: nextSiteId,
          updatedAt: new Date(),
        })
        .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
        .returning();

      if (parsed.data.name) {
        await app.db
          .update(users)
          .set({ name: parsed.data.name, updatedAt: new Date() })
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

      return { employee: updated };
    },
  );

  app.get("/:id", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const rows = await app.db
      .select({
        id: employees.id,
        tenantId: employees.tenantId,
        phone: employees.phone,
        jobTitle: employees.jobTitle,
        status: employees.status,
        branchId: employees.branchId,
        siteId: employees.siteId,
        name: users.name,
        email: users.email,
        role: users.role,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)))
      .limit(1);
    if (!rows[0]) return reply.code(404).send({ error: "Not found" });
    return { employee: rows[0] };
  });
};
