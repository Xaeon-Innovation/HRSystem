import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import {
  createDb,
  employees,
  jobRoles,
  plans,
  tenantSubscriptions,
  tenants,
  users,
  branches,
  sites,
  analyticsMetricDefinitions,
  notifications,
  sealSecret,
} from "./index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";

const DEFAULT_PLANS = [
  {
    code: "trial",
    name: "Trial",
    description: "14-day free trial for new tenants",
    amountCents: 0,
    currency: "USD",
    intervalDays: 15,
    seatLimit: 10,
    active: true,
    features: { trialDays: 14, integrations: true, analytics: true },
  },
  {
    code: "starter",
    name: "Starter",
    description: "Small teams getting started",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    active: true,
    features: {},
  },
  {
    code: "pro",
    name: "Pro",
    description: "Growing field operations",
    amountCents: 14900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 100,
    active: true,
    features: { integrations: true, analytics: true },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited seats and priority support",
    amountCents: 49900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: null,
    active: true,
    features: { integrations: true, analytics: true },
  },
] as const;

async function main() {
  const { db, client } = createDb(connectionString);

  const superEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@hr.local";
  const superPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";

  const existingSuper = await db.query.users.findFirst({
    where: eq(users.email, superEmail),
  });

  if (!existingSuper) {
    await db.insert(users).values({
      tenantId: null,
      email: superEmail,
      name: "Platform Super Admin",
      role: "super_admin",
      passwordHash: await bcrypt.hash(superPassword, 10),
    });
    console.log(`Created super admin ${superEmail}`);
  }

  for (const plan of DEFAULT_PLANS) {
    const existing = await db.query.plans.findFirst({
      where: eq(plans.code, plan.code),
    });
    if (!existing) {
      await db.insert(plans).values(plan);
      console.log(`Created plan ${plan.code}`);
    } else {
      await db
        .update(plans)
        .set({ features: plan.features, updatedAt: new Date() })
        .where(eq(plans.id, existing.id));
    }
  }

  const trialPlan = await db.query.plans.findFirst({
    where: eq(plans.code, "trial"),
  });

  async function ensureTenant(
    slug: string,
    name: string,
    adminEmail: string,
    adminPassword: string,
  ) {
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
    if (!tenant) {
      const [created] = await db
        .insert(tenants)
        .values({
          name,
          slug,
          settings: {
            timezone: "Africa/Cairo",
            pingIntervalSec: 20,
            locationRetentionDays: 60,
            missedClockOutHours: 12,
            brandingName: name,
            defaultHourlyCost: 15,
          },
        })
        .returning();
      tenant = created;
      console.log(`Created tenant ${slug}`);
    }

    let admin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });
    if (!admin) {
      const [createdAdmin] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: adminEmail,
          name: `${name} Admin`,
          role: "tenant_admin",
          passwordHash: await bcrypt.hash(adminPassword, 10),
          loginPasswordCipher: sealSecret(adminPassword),
        })
        .returning();
      admin = createdAdmin;

      await db.insert(employees).values({
        tenantId: tenant.id,
        userId: admin.id,
        jobTitle: "Tenant Admin",
        phone: "+201000000010",
        nationalId: `${slug}-admin-nid`,
        dateOfBirth: "1985-06-01",
        address: `${name} HQ`,
        hireDate: "2020-01-15",
        status: "active",
      });
      console.log(`Created tenant admin ${adminEmail}`);
    } else if (!admin.loginPasswordCipher) {
      await db
        .update(users)
        .set({
          loginPasswordCipher: sealSecret(adminPassword),
          updatedAt: new Date(),
        })
        .where(eq(users.id, admin.id));
    }

    const empEmail = `employee@${slug}.local`;
    let empUser = await db.query.users.findFirst({
      where: eq(users.email, empEmail),
    });
    if (!empUser) {
      const [createdEmp] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: empEmail,
          name: `${name} Employee`,
          role: "employee",
          passwordHash: await bcrypt.hash("Employee123!", 10),
          loginPasswordCipher: sealSecret("Employee123!"),
        })
        .returning();
      empUser = createdEmp;
      await db.insert(employees).values({
        tenantId: tenant.id,
        userId: empUser.id,
        jobTitle: "Field Worker",
        phone: "+201000000011",
        nationalId: `${slug}-emp-nid`,
        dateOfBirth: "1992-03-20",
        address: `${name} field office`,
        hireDate: "2023-06-01",
        status: "active",
      });
      console.log(`Created employee ${empEmail}`);
    } else if (!empUser.loginPasswordCipher) {
      await db
        .update(users)
        .set({
          loginPasswordCipher: sealSecret("Employee123!"),
          updatedAt: new Date(),
        })
        .where(eq(users.id, empUser.id));
    }

    if (trialPlan) {
      const existingSub = await db.query.tenantSubscriptions.findFirst({
        where: eq(tenantSubscriptions.tenantId, tenant.id),
      });
      if (!existingSub) {
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await db.insert(tenantSubscriptions).values({
          tenantId: tenant.id,
          planId: trialPlan.id,
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnds,
          trialEndsAt: trialEnds,
        });
        console.log(`Created trial subscription for ${slug}`);
      }
    }

    return tenant;
  }

  const cms = await ensureTenant(
    "cms",
    "Creative Multi Solutions",
    "admin@cms.local",
    "Admin123!",
  );
  await ensureTenant(
    "acme",
    "Acme Field Services",
    "admin@acme.local",
    "Admin123!",
  );

  async function ensureBranch(
    tenantId: string,
    name: string,
    code: string,
  ) {
    const existing = await db.query.branches.findFirst({
      where: eq(branches.tenantId, tenantId),
    });
    if (existing) return existing;
    const [created] = await db
      .insert(branches)
      .values({ tenantId, name, code, status: "active" })
      .returning();
    await db.insert(sites).values({
      tenantId,
      branchId: created.id,
      name: `${name} HQ`,
      code: `${code}-hq`,
    });
    console.log(`Created branch ${code} for tenant`);
    return created;
  }

  await ensureBranch(cms.id, "Cairo HQ", "cairo");

  async function ensureJobRoles(tenantId: string, names: string[]) {
    for (const name of names) {
      const existing = await db.query.jobRoles.findFirst({
        where: and(eq(jobRoles.tenantId, tenantId), eq(jobRoles.name, name)),
      });
      if (!existing) {
        await db.insert(jobRoles).values({ tenantId, name });
      }
    }
  }

  await ensureJobRoles(cms.id, [
    "Sales",
    "Driver",
    "Coordinator",
    "Operations",
  ]);
  const acme = await db.query.tenants.findFirst({
    where: eq(tenants.slug, "acme"),
  });
  if (acme) {
    await ensureJobRoles(acme.id, [
      "Sales",
      "Driver",
      "Coordinator",
      "Operations",
    ]);
  }

  const defaultMetrics = [
    {
      key: "attendance_rate",
      name: "Attendance rate",
      description: "Clocked-in employees / active employees",
      formulaConfig: { expression: "clocked_in / active_employees" },
    },
    {
      key: "lateness_rate",
      name: "Lateness rate",
      description: "Employees with lateness / clocked-in employees",
      formulaConfig: { expression: "late_employees / clocked_in" },
    },
    {
      key: "missed_clock_out_rate",
      name: "Missed clock-out rate",
      description: "Missed clock-outs / clocked-in employees",
      formulaConfig: { expression: "missed_clock_outs / clocked_in" },
    },
    {
      key: "total_work_hours",
      name: "Total work hours",
      description: "Sum of work minutes / 60",
      formulaConfig: { expression: "total_work_minutes / 60" },
    },
    {
      key: "gps_coverage_completeness",
      name: "GPS coverage completeness",
      description: "GPS pings received / expected",
      formulaConfig: { expression: "gps_updates_count / gps_expected_count" },
    },
    {
      key: "jobs_completed",
      name: "Jobs completed",
      description: "Canonical jobs completed",
      formulaConfig: { expression: "jobs_completed_count" },
    },
    {
      key: "visits_completed",
      name: "Visits completed",
      description: "Canonical visits completed",
      formulaConfig: { expression: "visits_completed_count" },
    },
    {
      key: "task_completion_rate",
      name: "Task completion rate",
      description: "Completed tasks / assigned tasks",
      formulaConfig: { expression: "tasks_completed_count / tasks_assigned_count" },
    },
    {
      key: "revenue_per_employee",
      name: "Revenue per employee",
      description: "Revenue / active employees",
      formulaConfig: { expression: "revenue_generated / active_employees" },
    },
    {
      key: "labor_cost_per_output",
      name: "Labor cost per output",
      description: "Labor cost / jobs+visits completed",
      formulaConfig: {
        expression:
          "labor_cost_estimate / (jobs_completed_count + visits_completed_count)",
      },
    },
    {
      key: "productivity_score",
      name: "Productivity score",
      description: "Weighted attendance, punctuality, and output",
      formulaType: "weighted_score" as const,
      formulaConfig: {
        weights: {
          attendance_quality: 0.25,
          punctuality: 0.15,
          jobs_completed: 0.2,
          visits_completed: 0.2,
          task_completion_rate: 0.1,
          kpi_score: 0.1,
        },
      },
    },
  ];

  for (const metric of defaultMetrics) {
    const existing = await db.query.analyticsMetricDefinitions.findFirst({
      where: and(
        eq(analyticsMetricDefinitions.key, metric.key),
        isNull(analyticsMetricDefinitions.tenantId),
      ),
    });
    if (!existing) {
      await db.insert(analyticsMetricDefinitions).values({
        tenantId: null,
        key: metric.key,
        name: metric.name,
        description: metric.description,
        formulaType: metric.formulaType ?? "expression",
        formulaConfig: metric.formulaConfig,
        aggregationLevel: "tenant",
        timeGrain: "day",
        version: 1,
        isActive: true,
      });
    }
  }

  const cmsAdmin = await db.query.users.findFirst({
    where: eq(users.email, "admin@cms.local"),
  });
  if (cmsAdmin?.tenantId) {
    const existingNote = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.tenantId, cmsAdmin.tenantId),
        eq(notifications.userId, cmsAdmin.id),
      ),
    });
    if (!existingNote) {
      const now = Date.now();
      await db.insert(notifications).values([
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "Leave request from Nour Ali",
          body: "Annual leave 12–16 Sep is waiting on your approval.",
          category: "leave",
          urgency: "info",
          eventKey: "leave_request_submitted",
          read: false,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 12 * 60 * 1000),
        },
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "Contract expiring — Karim Haddad",
          body: "Fixed-term contract ends in 18 days. Renewal decision is due.",
          category: "employee",
          urgency: "critical",
          eventKey: "contract_expiring",
          read: false,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 2 * 60 * 60 * 1000),
        },
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "KPI below target — Field quality",
          body: "Amina Hassan scored 54 against a target of 80 for August.",
          category: "kpi",
          urgency: "warning",
          eventKey: "kpi_below_target",
          read: false,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 5 * 60 * 60 * 1000),
        },
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "Three no-shows this morning",
          body: "Cairo branch has 3 employees absent today with no leave request.",
          category: "attendance",
          urgency: "critical",
          eventKey: "noshow_without_request",
          read: false,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 26 * 60 * 60 * 1000),
        },
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "Payroll cutoff in 2 days",
          body: "Missing overtime input for 4 field staff before Thursday cutoff.",
          category: "payroll",
          urgency: "warning",
          eventKey: "payroll_cutoff_approaching",
          read: true,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        },
        {
          tenantId: cmsAdmin.tenantId,
          userId: cmsAdmin.id,
          type: "alert",
          title: "Creative CMS sync failed",
          body: "The 06:00 polling run returned 502. Last successful sync was yesterday.",
          category: "system",
          urgency: "critical",
          eventKey: "integration_sync_failed",
          read: true,
          deliveryStatus: "delivered_local",
          createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
      console.log("Seeded demo alerts for admin@cms.local");
    }
  }

  await client.end();
  console.log("Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
