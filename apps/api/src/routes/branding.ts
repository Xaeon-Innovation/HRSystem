import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { tenants, type TenantSettings } from "@hr/db";
import {
  updateBrandingSchema,
  uploadLogoSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  decodeBase64Image,
  detectImageMime,
  logoUrlFor,
} from "../lib/avatar.js";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

const PRESETS = new Set(["neutral", "teal", "forest", "slate"]);

type TenantRow = {
  id: string;
  updatedAt: Date;
  logoMime?: string | null;
  settings: TenantSettings;
};

function brandingOf(tenant: TenantRow) {
  const settings = tenant.settings ?? {};
  const brandPreset =
    settings.brandPreset && PRESETS.has(settings.brandPreset)
      ? settings.brandPreset
      : "neutral";
  return {
    brandingName: settings.brandingName?.trim() || "HR Track",
    logoUrl: logoUrlFor(tenant.id, tenant.logoMime, tenant.updatedAt),
    brandPreset,
  };
}

export const brandingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/branding", async (request) => {
    const tenantId = tenantIdOf(request);
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) return { branding: brandingOf({ id: tenantId, updatedAt: new Date(), settings: {} }) };
    return { branding: brandingOf(tenant) };
  });

  app.patch(
    "/branding",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = updateBrandingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) return reply.code(404).send({ error: "Not found" });

      const previous = brandingOf(tenant);
      const nextSettings = {
        ...tenant.settings,
        ...(parsed.data.brandingName !== undefined
          ? { brandingName: parsed.data.brandingName.trim() }
          : {}),
        ...(parsed.data.brandPreset !== undefined
          ? { brandPreset: parsed.data.brandPreset }
          : {}),
      };

      const [updated] = await app.db
        .update(tenants)
        .set({
          settings: nextSettings,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      const next = brandingOf(updated);
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "tenant.branding.update",
        tenantId,
        resourceType: "tenant",
        resourceId: tenantId,
        metadata: { before: previous, after: next },
        request,
      });

      return { branding: next };
    },
  );

  app.post(
    "/branding/logo",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = uploadLogoSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      let buf: Buffer;
      try {
        buf = decodeBase64Image(parsed.data.imageBase64);
      } catch (err) {
        return reply
          .code(400)
          .send({ error: err instanceof Error ? err.message : "Invalid image" });
      }
      const mime = detectImageMime(buf);
      if (!mime) {
        return reply
          .code(400)
          .send({ error: "Use a JPEG, PNG, WebP, or GIF image" });
      }

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) return reply.code(404).send({ error: "Not found" });

      const previous = brandingOf(tenant);
      const nextSettings = { ...tenant.settings, logoUrl: null };
      const [updated] = await app.db
        .update(tenants)
        .set({
          logoMime: mime,
          logoBytes: buf.toString("base64"),
          settings: nextSettings,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      const next = brandingOf(updated);
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "tenant.branding.logo.update",
        tenantId,
        resourceType: "tenant",
        resourceId: tenantId,
        metadata: { before: previous, after: next },
        request,
      });

      return { branding: next };
    },
  );

  app.delete(
    "/branding/logo",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      if (!tenant) return reply.code(404).send({ error: "Not found" });

      const previous = brandingOf(tenant);
      const nextSettings = { ...tenant.settings, logoUrl: null };
      const [updated] = await app.db
        .update(tenants)
        .set({
          logoMime: null,
          logoBytes: null,
          settings: nextSettings,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning();

      const next = brandingOf(updated);
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "tenant.branding.logo.delete",
        tenantId,
        resourceType: "tenant",
        resourceId: tenantId,
        metadata: { before: previous, after: next },
        request,
      });

      return { branding: next };
    },
  );
};
