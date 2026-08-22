import { and, eq, inArray } from "drizzle-orm";
import {
  canonicalCustomers,
  canonicalProjects,
  integrationFieldMappings,
  integrationRawEvents,
  type Db,
} from "@hr/db";
import { hashExternalId, mapRecord } from "./mapper.js";
import { resolveBranch, resolveEmployee } from "./resolve-identity.js";
import { upsertCanonical } from "./upsert-canonical.js";

const DEAD_LETTER_AFTER = 3;

export async function storeRawEvents(
  db: Db,
  input: {
    tenantId: string;
    connectionId: string;
    syncRunId?: string | null;
    sourceEventType: string;
    records: Array<{ externalRecordId: string; payload: Record<string, unknown> }>;
  },
): Promise<number> {
  let stored = 0;
  for (const rec of input.records) {
    const inserted = await db
      .insert(integrationRawEvents)
      .values({
        tenantId: input.tenantId,
        connectionId: input.connectionId,
        syncRunId: input.syncRunId ?? null,
        sourceEventType: input.sourceEventType,
        externalRecordId: rec.externalRecordId || hashExternalId(rec.payload),
        payloadJson: rec.payload,
        processingStatus: "pending",
      })
      .onConflictDoUpdate({
        target: [
          integrationRawEvents.tenantId,
          integrationRawEvents.connectionId,
          integrationRawEvents.externalRecordId,
          integrationRawEvents.sourceEventType,
        ],
        set: {
          payloadJson: rec.payload,
          syncRunId: input.syncRunId ?? null,
          processingStatus: "pending",
          errorDetails: null,
          processedAt: null,
        },
      })
      .returning({ id: integrationRawEvents.id });
    if (inserted.length) stored += 1;
  }
  return stored;
}

export async function processRawEvent(
  db: Db,
  eventId: string,
  tenantId: string,
): Promise<{ ok: boolean; error?: string }> {
  const event = await db.query.integrationRawEvents.findFirst({
    where: and(
      eq(integrationRawEvents.id, eventId),
      eq(integrationRawEvents.tenantId, tenantId),
    ),
  });
  if (!event) return { ok: false, error: "Event not found" };

  const mappings = await db.query.integrationFieldMappings.findMany({
    where: and(
      eq(integrationFieldMappings.tenantId, tenantId),
      eq(integrationFieldMappings.connectionId, event.connectionId),
    ),
  });

  const sourceEntity = event.sourceEventType;
  const relevant = mappings.filter(
    (m) => m.sourceEntity === sourceEntity || m.sourceEntity === "*",
  );
  if (relevant.length === 0) {
    await mark(db, event.id, tenantId, "dead_letter", "No field mappings for source entity");
    return { ok: false, error: "No field mappings" };
  }

  const byTarget = new Map<string, typeof relevant>();
  for (const rule of relevant) {
    const list = byTarget.get(rule.targetEntity) ?? [];
    list.push(rule);
    byTarget.set(rule.targetEntity, list);
  }

  try {
    for (const [targetEntity, rules] of byTarget) {
      const { mapped, missing } = mapRecord(
        event.payloadJson,
        rules.map((r) => ({
          sourceField: r.sourceField,
          targetField: r.targetField,
          transformType: r.transformType,
          transformConfig: r.transformConfig,
          isRequired: r.isRequired,
        })),
      );
      if (missing.length) {
        throw new Error(`Missing required fields: ${missing.join(", ")}`);
      }
      if (!mapped.external_record_id) {
        mapped.external_record_id = event.externalRecordId;
      }

      const identity = await resolveEmployee(db, tenantId, event.connectionId, {
        externalEmployeeKey: str(mapped.employee_external_key),
        employeeEmail: str(mapped.employee_email),
        employeePhone: str(mapped.employee_phone),
      });
      const branch = await resolveBranch(
        db,
        tenantId,
        event.connectionId,
        str(mapped.branch_external_key),
      );

      let customerId: string | null = null;
      const customerKey = str(mapped.customer_external_key);
      if (customerKey) {
        const customer = await db.query.canonicalCustomers.findFirst({
          where: and(
            eq(canonicalCustomers.tenantId, tenantId),
            eq(canonicalCustomers.sourceConnectionId, event.connectionId),
            eq(canonicalCustomers.externalRecordId, customerKey),
          ),
        });
        customerId = customer?.id ?? null;
      }

      let projectId: string | null = null;
      const projectKey = str(mapped.project_external_key);
      if (projectKey) {
        const project = await db.query.canonicalProjects.findFirst({
          where: and(
            eq(canonicalProjects.tenantId, tenantId),
            eq(canonicalProjects.sourceConnectionId, event.connectionId),
            eq(canonicalProjects.externalRecordId, projectKey),
          ),
        });
        projectId = project?.id ?? null;
      }

      await upsertCanonical(db, {
        tenantId,
        connectionId: event.connectionId,
        targetEntity,
        mapped,
        employeeId: identity.employeeId,
        branchId: branch.branchId,
        siteId: branch.siteId,
        customerId,
        projectId,
      });
    }

    await mark(db, event.id, tenantId, "processed");
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "transform failed";
    const attempts = Number(event.payloadJson.__attempts ?? 0) + 1;
    const status = attempts >= DEAD_LETTER_AFTER ? "dead_letter" : "failed";
    await db
      .update(integrationRawEvents)
      .set({
        processingStatus: status,
        errorDetails: message,
        payloadJson: { ...event.payloadJson, __attempts: attempts },
      })
      .where(
        and(
          eq(integrationRawEvents.id, event.id),
          eq(integrationRawEvents.tenantId, tenantId),
        ),
      );
    return { ok: false, error: message };
  }
}

async function mark(
  db: Db,
  id: string,
  tenantId: string,
  status: "processed" | "failed" | "dead_letter" | "pending",
  error?: string,
) {
  await db
    .update(integrationRawEvents)
    .set({
      processingStatus: status,
      processedAt: status === "processed" ? new Date() : null,
      errorDetails: error ?? null,
    })
    .where(
      and(eq(integrationRawEvents.id, id), eq(integrationRawEvents.tenantId, tenantId)),
    );
}

function str(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export async function drainPendingRawEvents(db: Db, limit = 50): Promise<number> {
  const pending = await db.query.integrationRawEvents.findMany({
    where: inArray(integrationRawEvents.processingStatus, ["pending", "failed"]),
    limit,
    orderBy: (t, { asc }) => [asc(t.receivedAt)],
  });
  let processed = 0;
  for (const event of pending) {
    const result = await processRawEvent(db, event.id, event.tenantId);
    if (result.ok) processed += 1;
  }
  return processed;
}

export async function replayDeadLetters(
  db: Db,
  tenantId: string,
  connectionId: string,
): Promise<number> {
  const rows = await db
    .update(integrationRawEvents)
    .set({ processingStatus: "pending", errorDetails: null })
    .where(
      and(
        eq(integrationRawEvents.tenantId, tenantId),
        eq(integrationRawEvents.connectionId, connectionId),
        eq(integrationRawEvents.processingStatus, "dead_letter"),
      ),
    )
    .returning({ id: integrationRawEvents.id });
  return rows.length;
}
