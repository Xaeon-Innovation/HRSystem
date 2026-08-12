import { auditLogs } from "@hr/db";
import type { JwtPayload } from "@hr/shared";
import type { FastifyRequest } from "fastify";
import type { App } from "../types.js";

export type WriteAuditInput = {
  actor?: Pick<JwtPayload, "sub" | "role" | "tenantId"> | null;
  action: string;
  tenantId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  request?: FastifyRequest;
};

export async function writeAudit(app: App, input: WriteAuditInput) {
  const ip =
    (input.request?.headers["x-forwarded-for"] as string | undefined)?.split(
      ",",
    )[0]?.trim() ??
    input.request?.ip ??
    null;
  const userAgent =
    (input.request?.headers["user-agent"] as string | undefined) ?? null;

  await app.db.insert(auditLogs).values({
    actorUserId: input.actor?.sub ?? null,
    actorRole: input.actor?.role ?? null,
    tenantId: input.tenantId ?? input.actor?.tenantId ?? null,
    action: input.action,
    resourceType: input.resourceType ?? null,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
    ip,
    userAgent,
  });
}
