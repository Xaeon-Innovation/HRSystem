import { and, desc, eq } from "drizzle-orm";
import {
  integrationConnections,
  integrationFieldMappings,
  integrationRawEvents,
  integrationSyncRuns,
  externalEmployeeLinks,
  externalBranchLinks,
  type Db,
} from "@hr/db";
import {
  CANONICAL_FIELD_MAP,
  createBranchLinkSchema,
  createEmployeeLinkSchema,
  createIntegrationConnectionSchema,
  csvImportSchema,
  updateIntegrationConnectionSchema,
  upsertFieldMappingSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { requirePlanFeature } from "../lib/features.js";
import { requireRoles, tenantIdOf } from "../types.js";
import { encryptJson } from "../integrations/crypto.js";
import { parseCsv } from "../integrations/connectors/csv.js";
import { pollRestConnection, testRestFetch } from "../integrations/connectors/rest.js";
import { hashExternalId } from "../integrations/mapper.js";
import {
  processRawEvent,
  replayDeadLetters,
  storeRawEvents,
} from "../integrations/process-raw.js";
import type { FastifyPluginAsync } from "fastify";

function publicConnection(row: typeof integrationConnections.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    providerType: row.providerType,
    status: row.status,
    authType: row.authType,
    hasAuth: Boolean(row.authConfigEncrypted),
    hasWebhookSecret: Boolean(row.webhookSecretEncrypted),
    baseUrl: row.baseUrl,
    syncMode: row.syncMode,
    pollIntervalMinutes: row.pollIntervalMinutes,
    connectorConfig: row.connectorConfig,
    lastSyncAt: row.lastSyncAt,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const integrationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requirePlanFeature("integrations"));
  app.addHook("preHandler", requireRoles("tenant_admin"));

  app.get("/catalog", async () => ({
    providers: [
      { type: "custom_api", label: "Custom REST API", implemented: true },
      { type: "webhook", label: "Webhook endpoint", implemented: true },
      { type: "csv", label: "CSV import", implemented: true },
      { type: "crm", label: "CRM (via custom REST/mapping)", implemented: false },
      { type: "cms", label: "CMS (via custom REST/mapping)", implemented: false },
      { type: "erp", label: "ERP (via custom REST/mapping)", implemented: false },
    ],
    canonicalFields: CANONICAL_FIELD_MAP,
  }));

  app.get("/connections", async (request) => {
    const tenantId = tenantIdOf(request);
    const rows = await app.db.query.integrationConnections.findMany({
      where: eq(integrationConnections.tenantId, tenantId),
      orderBy: (t, { desc: d }) => [d(t.updatedAt)],
    });
    return { connections: rows.map(publicConnection) };
  });

  app.post(
    "/connections",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createIntegrationConnectionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const data = parsed.data;
      const actor = request.user as JwtPayload;
      const [row] = await app.db
        .insert(integrationConnections)
        .values({
          tenantId,
          name: data.name,
          providerType: data.providerType,
          status: data.status ?? "draft",
          authType: data.authType ?? "none",
          authConfigEncrypted: data.authConfig
            ? encryptJson(data.authConfig)
            : null,
          webhookSecretEncrypted: data.webhookSecret
            ? encryptJson({ secret: data.webhookSecret })
            : null,
          baseUrl: data.baseUrl ?? null,
          syncMode: data.syncMode ?? "manual",
          pollIntervalMinutes: data.pollIntervalMinutes ?? null,
          connectorConfig: data.connectorConfig ?? {},
          createdBy: actor.sub,
        })
        .returning();
      await writeAudit(app, {
        actor,
        action: "integration.connection.create",
        tenantId,
        resourceType: "integration_connection",
        resourceId: row.id,
        metadata: { name: row.name, providerType: row.providerType },
        request,
      });
      return reply.code(201).send({ connection: publicConnection(row) });
    },
  );

  app.get("/connections/:id", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const row = await app.db.query.integrationConnections.findFirst({
      where: and(
        eq(integrationConnections.id, id),
        eq(integrationConnections.tenantId, tenantId),
      ),
    });
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { connection: publicConnection(row) };
  });

  app.patch(
    "/connections/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateIntegrationConnectionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const data = parsed.data;
      const [updated] = await app.db
        .update(integrationConnections)
        .set({
          name: data.name ?? existing.name,
          providerType: data.providerType ?? existing.providerType,
          status: data.status ?? existing.status,
          authType: data.authType ?? existing.authType,
          authConfigEncrypted:
            data.authConfig !== undefined
              ? encryptJson(data.authConfig)
              : existing.authConfigEncrypted,
          webhookSecretEncrypted:
            data.webhookSecret === undefined
              ? existing.webhookSecretEncrypted
              : data.webhookSecret
                ? encryptJson({ secret: data.webhookSecret })
                : null,
          baseUrl: data.baseUrl === undefined ? existing.baseUrl : data.baseUrl,
          syncMode: data.syncMode ?? existing.syncMode,
          pollIntervalMinutes:
            data.pollIntervalMinutes === undefined
              ? existing.pollIntervalMinutes
              : data.pollIntervalMinutes,
          connectorConfig: data.connectorConfig ?? existing.connectorConfig,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(integrationConnections.id, id),
            eq(integrationConnections.tenantId, tenantId),
          ),
        )
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "integration.connection.update",
        tenantId,
        resourceType: "integration_connection",
        resourceId: id,
        request,
      });
      return { connection: publicConnection(updated) };
    },
  );

  app.post(
    "/connections/:id/test",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const row = await app.db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.tenantId, tenantId),
        ),
      });
      if (!row) return reply.code(404).send({ error: "Not found" });
      const result = await testRestFetch(row);
      return result;
    },
  );

  app.post(
    "/connections/:id/sync",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const row = await app.db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.tenantId, tenantId),
        ),
      });
      if (!row) return reply.code(404).send({ error: "Not found" });
      const run = await runConnectionSync(app.db, row, "manual");
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "integration.sync",
        tenantId,
        resourceType: "integration_connection",
        resourceId: id,
        metadata: { runId: run.id, status: run.status },
        request,
      });
      return { run };
    },
  );

  app.get("/connections/:id/sync-runs", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const rows = await app.db.query.integrationSyncRuns.findMany({
      where: and(
        eq(integrationSyncRuns.tenantId, tenantId),
        eq(integrationSyncRuns.connectionId, id),
      ),
      orderBy: [desc(integrationSyncRuns.startedAt)],
      limit: 50,
    });
    return { runs: rows };
  });

  app.get("/connections/:id/mappings", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const rows = await app.db.query.integrationFieldMappings.findMany({
      where: and(
        eq(integrationFieldMappings.tenantId, tenantId),
        eq(integrationFieldMappings.connectionId, id),
      ),
    });
    return { mappings: rows, canonicalFields: CANONICAL_FIELD_MAP };
  });

  app.post(
    "/connections/:id/mappings",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = upsertFieldMappingSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const conn = await app.db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.tenantId, tenantId),
        ),
      });
      if (!conn) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(integrationFieldMappings)
        .where(
          and(
            eq(integrationFieldMappings.tenantId, tenantId),
            eq(integrationFieldMappings.connectionId, id),
          ),
        );
      if (parsed.data.mappings.length) {
        await app.db.insert(integrationFieldMappings).values(
          parsed.data.mappings.map((m) => ({
            tenantId,
            connectionId: id,
            sourceEntity: m.sourceEntity,
            sourceField: m.sourceField,
            targetEntity: m.targetEntity,
            targetField: m.targetField,
            transformType: m.transformType ?? "direct",
            transformConfig: m.transformConfig ?? {},
            isRequired: m.isRequired ?? false,
          })),
        );
      }
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "integration.mapping.update",
        tenantId,
        resourceType: "integration_connection",
        resourceId: id,
        metadata: { count: parsed.data.mappings.length },
        request,
      });
      const rows = await app.db.query.integrationFieldMappings.findMany({
        where: and(
          eq(integrationFieldMappings.tenantId, tenantId),
          eq(integrationFieldMappings.connectionId, id),
        ),
      });
      return { mappings: rows };
    },
  );

  app.get("/connections/:id/raw-events", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const status = (request.query as { status?: string }).status;
    const rows = await app.db.query.integrationRawEvents.findMany({
      where: and(
        eq(integrationRawEvents.tenantId, tenantId),
        eq(integrationRawEvents.connectionId, id),
        status
          ? eq(
              integrationRawEvents.processingStatus,
              status as typeof integrationRawEvents.$inferSelect.processingStatus,
            )
          : undefined,
      ),
      orderBy: [desc(integrationRawEvents.receivedAt)],
      limit: 100,
    });
    return { events: rows };
  });

  app.post(
    "/connections/:id/replay",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const queued = await replayDeadLetters(app.db, tenantId, id);
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "integration.replay",
        tenantId,
        resourceType: "integration_connection",
        resourceId: id,
        metadata: { queued },
        request,
      });
      return { queued };
    },
  );

  app.post(
    "/connections/:id/csv/preview",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const parsed = csvImportSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const { headers, rows } = parseCsv(parsed.data.csv);
      return {
        headers,
        preview: rows.slice(0, 20),
        rowCount: rows.length,
        targetEntity: parsed.data.targetEntity,
        canonicalFields:
          CANONICAL_FIELD_MAP[
            parsed.data.targetEntity as keyof typeof CANONICAL_FIELD_MAP
          ],
      };
    },
  );

  app.post(
    "/connections/:id/csv/import",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = csvImportSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const conn = await app.db.query.integrationConnections.findFirst({
        where: and(
          eq(integrationConnections.id, id),
          eq(integrationConnections.tenantId, tenantId),
        ),
      });
      if (!conn) return reply.code(404).send({ error: "Not found" });
      const { rows } = parseCsv(parsed.data.csv);
      const [run] = await app.db
        .insert(integrationSyncRuns)
        .values({
          tenantId,
          connectionId: id,
          triggerType: "csv",
          status: "running",
          recordsReceived: rows.length,
        })
        .returning();
      await storeRawEvents(app.db, {
        tenantId,
        connectionId: id,
        syncRunId: run.id,
        sourceEventType: parsed.data.sourceEntity,
        records: rows.map((row) => ({
          externalRecordId: String(
            row.id ?? row.external_id ?? hashExternalId(row),
          ),
          payload: row,
        })),
      });
      let processed = 0;
      let failed = 0;
      const pending = await app.db.query.integrationRawEvents.findMany({
        where: and(
          eq(integrationRawEvents.tenantId, tenantId),
          eq(integrationRawEvents.syncRunId, run.id),
        ),
      });
      for (const event of pending) {
        const result = await processRawEvent(app.db, event.id, tenantId);
        if (result.ok) processed += 1;
        else failed += 1;
      }
      const status =
        failed === 0 ? "success" : processed === 0 ? "failed" : "partial";
      const [updated] = await app.db
        .update(integrationSyncRuns)
        .set({
          status,
          recordsProcessed: processed,
          recordsFailed: failed,
          endedAt: new Date(),
        })
        .where(eq(integrationSyncRuns.id, run.id))
        .returning();
      await app.db
        .update(integrationConnections)
        .set({ lastSyncAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(integrationConnections.id, id));
      return { run: updated };
    },
  );

  app.get("/connections/:id/links", async (request) => {
    const tenantId = tenantIdOf(request);
    const { id } = request.params as { id: string };
    const employees = await app.db.query.externalEmployeeLinks.findMany({
      where: and(
        eq(externalEmployeeLinks.tenantId, tenantId),
        eq(externalEmployeeLinks.connectionId, id),
      ),
    });
    const branches = await app.db.query.externalBranchLinks.findMany({
      where: and(
        eq(externalBranchLinks.tenantId, tenantId),
        eq(externalBranchLinks.connectionId, id),
      ),
    });
    return { employees, branches };
  });

  app.post(
    "/links/employees",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createEmployeeLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [row] = await app.db
        .insert(externalEmployeeLinks)
        .values({
          tenantId,
          connectionId: parsed.data.connectionId,
          externalEmployeeKey: parsed.data.externalEmployeeKey,
          employeeId: parsed.data.employeeId,
          matchMethod: parsed.data.matchMethod ?? "manual",
          matchConfidence: 1,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [
            externalEmployeeLinks.tenantId,
            externalEmployeeLinks.connectionId,
            externalEmployeeLinks.externalEmployeeKey,
          ],
          set: {
            employeeId: parsed.data.employeeId,
            matchMethod: parsed.data.matchMethod ?? "manual",
            matchConfidence: 1,
            isActive: true,
          },
        })
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "integration.employee_link.upsert",
        tenantId,
        resourceType: "external_employee_link",
        resourceId: row.id,
        request,
      });
      return { link: row };
    },
  );

  app.post(
    "/links/branches",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createBranchLinkSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [row] = await app.db
        .insert(externalBranchLinks)
        .values({
          tenantId,
          connectionId: parsed.data.connectionId,
          externalBranchKey: parsed.data.externalBranchKey,
          branchId: parsed.data.branchId ?? null,
          siteId: parsed.data.siteId ?? null,
        })
        .onConflictDoUpdate({
          target: [
            externalBranchLinks.tenantId,
            externalBranchLinks.connectionId,
            externalBranchLinks.externalBranchKey,
          ],
          set: {
            branchId: parsed.data.branchId ?? null,
            siteId: parsed.data.siteId ?? null,
          },
        })
        .returning();
      return { link: row };
    },
  );
};

export async function runConnectionSync(
  db: Db,
  connection: typeof integrationConnections.$inferSelect,
  triggerType: "schedule" | "manual",
) {
  const last = await db.query.integrationSyncRuns.findFirst({
    where: and(
      eq(integrationSyncRuns.tenantId, connection.tenantId),
      eq(integrationSyncRuns.connectionId, connection.id),
    ),
    orderBy: [desc(integrationSyncRuns.startedAt)],
  });
  const [run] = await db
    .insert(integrationSyncRuns)
    .values({
      tenantId: connection.tenantId,
      connectionId: connection.id,
      triggerType,
      status: "running",
      cursorJson: last?.cursorJson ?? {},
    })
    .returning();

  try {
    const { records, nextCursor } = await pollRestConnection(
      connection,
      last?.cursorJson ?? {},
    );
    for (const rec of records) {
      await storeRawEvents(db, {
        tenantId: connection.tenantId,
        connectionId: connection.id,
        syncRunId: run.id,
        sourceEventType: rec.sourceEventType,
        records: [
          { externalRecordId: rec.externalRecordId, payload: rec.payload },
        ],
      });
    }

    const pending = await db.query.integrationRawEvents.findMany({
      where: and(
        eq(integrationRawEvents.tenantId, connection.tenantId),
        eq(integrationRawEvents.syncRunId, run.id),
      ),
    });
    let processed = 0;
    let failed = 0;
    for (const event of pending) {
      const result = await processRawEvent(db, event.id, connection.tenantId);
      if (result.ok) processed += 1;
      else failed += 1;
    }
    const status =
      failed === 0 ? "success" : processed === 0 ? "failed" : "partial";
    const [updated] = await db
      .update(integrationSyncRuns)
      .set({
        status,
        recordsReceived: records.length,
        recordsProcessed: processed,
        recordsFailed: failed,
        cursorJson: nextCursor,
        endedAt: new Date(),
      })
      .where(eq(integrationSyncRuns.id, run.id))
      .returning();
    await db
      .update(integrationConnections)
      .set({
        lastSyncAt: new Date(),
        lastError: status === "failed" ? "Sync failed" : null,
        status: status === "failed" ? "error" : "active",
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connection.id));
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync failed";
    const [updated] = await db
      .update(integrationSyncRuns)
      .set({
        status: "failed",
        errorSummary: message,
        endedAt: new Date(),
      })
      .where(eq(integrationSyncRuns.id, run.id))
      .returning();
    await db
      .update(integrationConnections)
      .set({
        lastError: message,
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, connection.id));
    return updated;
  }
}
