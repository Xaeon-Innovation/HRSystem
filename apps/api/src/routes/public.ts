import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { leads, plans } from "@hr/db";
import {
  isSeatQuoteCode,
  publicDemoRequestSchema,
  publicSignupSchema,
  validateSeatCount,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  signTokens,
  toAuthUser,
  toJwtPayload,
} from "../lib/auth-tokens.js";
import { provisionTenant } from "../lib/tenant-provision.js";
import { sendEmail } from "../services/mail.js";

const SUPPORT_EMAIL =
  process.env.ELEVORA_SUPPORT_EMAIL?.trim() || "info@xaeons.com";
const WEB_APP_URL =
  process.env.WEB_APP_URL?.trim() || "http://localhost:3000";

const strictLimit = {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: "1 hour",
    },
  },
};

function publicPlanView(row: typeof plans.$inferSelect) {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    amountCents: row.amountCents,
    currency: row.currency,
    intervalDays: row.intervalDays,
    seatLimit: row.seatLimit,
    features: row.features ?? {},
  };
}

export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/plans",
    {
      config: {
        rateLimit: { max: 60, timeWindow: "1 minute" },
      },
    },
    async () => {
      const rows = await app.db.query.plans.findMany({
        where: eq(plans.active, true),
        orderBy: (t, { asc }) => [asc(t.amountCents), asc(t.name)],
      });
      return { plans: rows.map(publicPlanView) };
    },
  );

  app.post("/signup", strictLimit, async (request, reply) => {
    const parsed = publicSignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const {
      acceptTerms: _accept,
      planCode,
      seats,
      ...tenantInput
    } = parsed.data;

    if (planCode) {
      const seatError = validateSeatCount(planCode, seats);
      if (seatError) {
        return reply.code(400).send({ error: seatError });
      }
      const plan = await app.db.query.plans.findFirst({
        where: and(eq(plans.code, planCode), eq(plans.active, true)),
      });
      if (!plan || plan.amountCents <= 0) {
        return reply
          .code(400)
          .send({ error: "Plan is not available for checkout" });
      }
    }

    const startTrial = !planCode;
    const provisioned = await provisionTenant(app.db, tenantInput, {
      startTrial,
    });
    if (!provisioned.ok) {
      return reply.code(provisioned.status).send({ error: provisioned.error });
    }

    const { tenant, admin, employeeId, subscription } = provisioned.result;
    const payload = toJwtPayload(admin, employeeId);
    const tokens = signTokens(app, payload);

    await app.db.insert(leads).values({
      source: startTrial ? "signup_trial" : "signup_paid",
      status: "new",
      name: admin.name,
      company: tenant.name,
      email: admin.email,
      tenantId: tenant.id,
      planCode: planCode ?? (startTrial ? "trial" : null),
      message: startTrial
        ? `Self-serve trial signup (${tenant.slug})`
        : `Self-serve paid signup (${planCode}, seats=${seats ?? "-"})`,
    });

    await writeAudit(app, {
      actor: payload,
      action: "tenant.signup",
      tenantId: tenant.id,
      resourceType: "tenant",
      resourceId: tenant.id,
      metadata: {
        slug: tenant.slug,
        adminEmail: admin.email,
        trialSubscriptionId: subscription?.id ?? null,
        planCode: planCode ?? null,
        seats: seats ?? null,
        source: "public",
      },
      request,
    });

    const loginUrl = `${WEB_APP_URL}/login?slug=${encodeURIComponent(tenant.slug)}`;

    if (startTrial) {
      void sendEmail({
        to: admin.email,
        subject: "Welcome to Polara, your trial is ready",
        text: [
          `Hi ${admin.name},`,
          "",
          `Your Polara workspace “${tenant.name}” is ready.`,
          `Organization slug: ${tenant.slug}`,
          `Sign in: ${loginUrl}`,
          "",
          "You are on a 14-day free trial. Upgrade anytime from Billing.",
          "",
          "Polara (a Xaeon product)",
          SUPPORT_EMAIL,
        ].join("\n"),
        html: `<p>Hi ${admin.name},</p>
<p>Your Polara workspace <strong>${tenant.name}</strong> is ready.</p>
<p>Organization slug: <code>${tenant.slug}</code><br/>
<a href="${loginUrl}">Sign in to Polara</a></p>
<p>You are on a 14-day free trial. Upgrade anytime from Billing.</p>
<p>- Polara (a Xaeon product)<br/><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`,
      });

      void sendEmail({
        to: SUPPORT_EMAIL,
        subject: `[Polara] New trial signup: ${tenant.name}`,
        text: [
          `New self-serve trial`,
          `Org: ${tenant.name}`,
          `Slug: ${tenant.slug}`,
          `Admin: ${admin.name} <${admin.email}>`,
          `Tenant id: ${tenant.id}`,
        ].join("\n"),
        html: `<p>New self-serve trial</p>
<ul>
<li>Org: ${tenant.name}</li>
<li>Slug: ${tenant.slug}</li>
<li>Admin: ${admin.name} &lt;${admin.email}&gt;</li>
<li>Tenant id: ${tenant.id}</li>
</ul>`,
      });
    } else {
      const planLabel = planCode ?? "plan";
      void sendEmail({
        to: admin.email,
        subject: "Welcome to Polara — complete checkout to activate",
        text: [
          `Hi ${admin.name},`,
          "",
          `Your Polara workspace “${tenant.name}” is ready.`,
          `Organization slug: ${tenant.slug}`,
          `Sign in: ${loginUrl}`,
          "",
          `Complete checkout to activate the ${planLabel} plan. Features unlock after payment confirms.`,
          "",
          "Polara (a Xaeon product)",
          SUPPORT_EMAIL,
        ].join("\n"),
        html: `<p>Hi ${admin.name},</p>
<p>Your Polara workspace <strong>${tenant.name}</strong> is ready.</p>
<p>Organization slug: <code>${tenant.slug}</code><br/>
<a href="${loginUrl}">Sign in to Polara</a></p>
<p>Complete checkout to activate the <strong>${planLabel}</strong> plan. Features unlock after payment confirms.</p>
<p>- Polara (a Xaeon product)<br/><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`,
      });

      void sendEmail({
        to: SUPPORT_EMAIL,
        subject: `[Polara] New paid signup: ${tenant.name} (${planLabel})`,
        text: [
          `New self-serve paid signup`,
          `Org: ${tenant.name}`,
          `Slug: ${tenant.slug}`,
          `Plan: ${planLabel}`,
          seats != null ? `Seats: ${seats}` : null,
          `Admin: ${admin.name} <${admin.email}>`,
          `Tenant id: ${tenant.id}`,
        ]
          .filter(Boolean)
          .join("\n"),
        html: `<p>New self-serve paid signup</p>
<ul>
<li>Org: ${tenant.name}</li>
<li>Slug: ${tenant.slug}</li>
<li>Plan: ${planLabel}</li>
${seats != null ? `<li>Seats: ${seats}</li>` : ""}
<li>Admin: ${admin.name} &lt;${admin.email}&gt;</li>
<li>Tenant id: ${tenant.id}</li>
</ul>`,
      });
    }

    return reply.code(201).send({
      ...tokens,
      user: toAuthUser(admin, employeeId),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      subscription,
      checkoutIntent: planCode
        ? {
            planCode,
            seats: isSeatQuoteCode(planCode) ? seats ?? null : null,
          }
        : null,
    });
  });

  app.post("/demo", strictLimit, async (request, reply) => {
    const parsed = publicDemoRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const messageLower = (data.message ?? "").toLowerCase();
    const source =
      messageLower.includes("enterprise") || messageLower.includes("custom")
        ? ("enterprise" as const)
        : ("demo" as const);

    await app.db.insert(leads).values({
      source,
      status: "new",
      name: data.name,
      company: data.company,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message ?? null,
      planCode: source === "enterprise" ? "enterprise" : null,
    });

    const sent = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Polara] Demo request: ${data.company}`,
      text: [
        `Demo request`,
        `Name: ${data.name}`,
        `Company: ${data.company}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone ?? "-"}`,
        `Message: ${data.message ?? "-"}`,
      ].join("\n"),
      html: `<p>Demo request</p>
<ul>
<li>Name: ${data.name}</li>
<li>Company: ${data.company}</li>
<li>Email: <a href="mailto:${data.email}">${data.email}</a></li>
<li>Phone: ${data.phone ?? "-"}</li>
</ul>
<p>${(data.message ?? "-").replace(/</g, "&lt;")}</p>`,
    });

    if (!sent.ok && sent.reason !== "not_configured") {
      return reply.code(502).send({ error: "Could not send demo request" });
    }

    return { ok: true };
  });
};
