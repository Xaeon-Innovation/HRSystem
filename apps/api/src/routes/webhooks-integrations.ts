import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { integrationConnections, integrationRawEvents, integrationSyncRuns } from "@hr/db";
import { decryptJson } from "../integrations/crypto.js";
import { verifyWebhookHmac } from "../integrations/connectors/auth.js";
import { asRecord, extractItems, getPath, hashExternalId } from "../integrations/mapper.js";
import { processRawEvent, storeRawEvents } from "../integrations/process-raw.js";

export const integrationWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.post("/:connectionId", async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    const connection = await app.db.query.integrationConnections.findFirst({
      where: eq(integrationConnections.id, connectionId),
    });
    if (!connection || connection.status === "paused") {
      return reply.code(404).send({ error: "Unknown connection" });
    }
    if (connection.syncMode !== "webhook" && connection.syncMode !== "hybrid") {
      return reply.code(400).send({ error: "Connection is not webhook-enabled" });
    }

    const rawBody = typeof request.body === "string" ? request.body : "{}";

    if (!connection.webhookSecretEncrypted) {
      return reply
        .code(401)
        .send({ error: "Webhook secret required for this connection" });
    }

    const { secret } = decryptJson<{ secret: string }>(
      connection.webhookSecretEncrypted,
    );
    const headerName = (
      connection.connectorConfig.hmacHeader ?? "x-signature"
    ).toLowerCase();
    const provided =
      (request.headers[headerName] as string | undefined) ??
      (request.headers["x-hub-signature-256"] as string | undefined) ??
      "";
    if (!verifyWebhookHmac(secret, rawBody, provided)) {
      return reply.code(401).send({ error: "Invalid HMAC" });
    }

    let parsedBody: unknown = {};
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return reply.code(400).send({ error: "Invalid JSON" });
    }

    const payload = asRecord(parsedBody) ?? {};
    const itemsPath = connection.connectorConfig.entities?.[0]?.itemsPath;
    const items = extractItems(
      Array.isArray(parsedBody) ? parsedBody : payload,
      Array.isArray(parsedBody) ? undefined : itemsPath,
    );
    const sourceEventType =
      connection.connectorConfig.entities?.[0]?.eventType ??
      connection.connectorConfig.entities?.[0]?.sourceEntity ??
      (typeof payload.event === "string" ? payload.event : "webhook");
    const idField = connection.connectorConfig.entities?.[0]?.idField ?? "id";

    const [run] = await app.db
      .insert(integrationSyncRuns)
      .values({
        tenantId: connection.tenantId,
        connectionId: connection.id,
        triggerType: "webhook",
        status: "running",
        recordsReceived: items.length,
      })
      .returning();

    const records = items.map((item) => {
      const rec = asRecord(item) ?? { value: item };
      return {
        externalRecordId: String(getPath(rec, idField) ?? hashExternalId(rec)),
        payload: rec,
      };
    });

    await storeRawEvents(app.db, {
      tenantId: connection.tenantId,
      connectionId: connection.id,
      syncRunId: run.id,
      sourceEventType,
      records,
    });

    const raw = await app.db.query.integrationRawEvents.findMany({
      where: and(
        eq(integrationRawEvents.tenantId, connection.tenantId),
        eq(integrationRawEvents.syncRunId, run.id),
      ),
    });
    let processed = 0;
    let failed = 0;
    for (const event of raw) {
      const result = await processRawEvent(app.db, event.id, connection.tenantId);
      if (result.ok) processed += 1;
      else failed += 1;
    }

    const status =
      failed === 0 ? "success" : processed === 0 ? "failed" : "partial";
    await app.db
      .update(integrationSyncRuns)
      .set({
        status,
        recordsProcessed: processed,
        recordsFailed: failed,
        endedAt: new Date(),
      })
      .where(eq(integrationSyncRuns.id, run.id));
    await app.db
      .update(integrationConnections)
      .set({ lastSyncAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(integrationConnections.id, connection.id));

    return { ok: true, received: records.length, processed, failed };
  });
};
