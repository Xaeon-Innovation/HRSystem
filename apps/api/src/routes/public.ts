import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { plans } from "@hr/db";
import {
  publicDemoRequestSchema,
  publicSignupSchema,
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
    const { acceptTerms: _accept, ...tenantInput } = parsed.data;
    const provisioned = await provisionTenant(app.db, tenantInput);
    if (!provisioned.ok) {
      return reply.code(provisioned.status).send({ error: provisioned.error });
    }

    const { tenant, admin, employeeId, subscription } = provisioned.result;
    const payload = toJwtPayload(admin, employeeId);
    const tokens = signTokens(app, payload);

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
        source: "public",
      },
      request,
    });

    const loginUrl = `${WEB_APP_URL}/login?slug=${encodeURIComponent(tenant.slug)}`;
    void sendEmail({
      to: admin.email,
      subject: "Welcome to Elevora, your trial is ready",
      text: [
        `Hi ${admin.name},`,
        "",
        `Your Elevora workspace “${tenant.name}” is ready.`,
        `Organization slug: ${tenant.slug}`,
        `Sign in: ${loginUrl}`,
        "",
        "You are on a 14-day free trial. Upgrade anytime from Billing.",
        "",
        "Elevora (a Xaeon product)",
        SUPPORT_EMAIL,
      ].join("\n"),
      html: `<p>Hi ${admin.name},</p>
<p>Your Elevora workspace <strong>${tenant.name}</strong> is ready.</p>
<p>Organization slug: <code>${tenant.slug}</code><br/>
<a href="${loginUrl}">Sign in to Elevora</a></p>
<p>You are on a 14-day free trial. Upgrade anytime from Billing.</p>
<p>- Elevora (a Xaeon product)<br/><a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`,
    });

    void sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Elevora] New trial signup: ${tenant.name}`,
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

    return reply.code(201).send({
      ...tokens,
      user: toAuthUser(admin, employeeId),
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      subscription,
    });
  });

  app.post("/demo", strictLimit, async (request, reply) => {
    const parsed = publicDemoRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const sent = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Elevora] Demo request: ${data.company}`,
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
