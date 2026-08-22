import {
  canonicalCustomers,
  canonicalJobEvents,
  canonicalProjects,
  canonicalSalesEvents,
  canonicalTaskEvents,
  canonicalVisitEvents,
  type Db,
} from "@hr/db";
import type { CanonicalTargetEntity } from "@hr/shared";

function asString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asDate(value: unknown, fallback = new Date()): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function asDateOrNull(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function upsertCanonical(
  db: Db,
  input: {
    tenantId: string;
    connectionId: string;
    targetEntity: CanonicalTargetEntity | string;
    mapped: Record<string, unknown>;
    employeeId: string | null;
    branchId: string | null;
    siteId: string | null;
    customerId?: string | null;
    projectId?: string | null;
  },
): Promise<void> {
  const { tenantId, connectionId, mapped } = input;
  const externalRecordId =
    asString(mapped.external_record_id) ?? `missing_${Date.now()}`;

  switch (input.targetEntity) {
    case "canonical_customer": {
      const name = asString(mapped.name) ?? externalRecordId;
      await db
        .insert(canonicalCustomers)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          name,
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalCustomers.tenantId,
            canonicalCustomers.sourceConnectionId,
            canonicalCustomers.externalRecordId,
          ],
          set: { name, metadataJson: mapped, updatedAt: new Date() },
        });
      return;
    }
    case "canonical_project": {
      const name = asString(mapped.name) ?? externalRecordId;
      await db
        .insert(canonicalProjects)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          customerId: input.customerId ?? null,
          name,
          status: asString(mapped.status),
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalProjects.tenantId,
            canonicalProjects.sourceConnectionId,
            canonicalProjects.externalRecordId,
          ],
          set: {
            name,
            status: asString(mapped.status),
            customerId: input.customerId ?? null,
            metadataJson: mapped,
            updatedAt: new Date(),
          },
        });
      return;
    }
    case "canonical_job_event": {
      const occurredAt = asDate(
        mapped.occurred_at ?? mapped.completed_at ?? mapped.scheduled_at,
      );
      await db
        .insert(canonicalJobEvents)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          employeeId: input.employeeId,
          branchId: input.branchId,
          siteId: input.siteId,
          customerId: input.customerId ?? null,
          projectId: input.projectId ?? null,
          eventType: asString(mapped.event_type) ?? "completed",
          status: asString(mapped.status),
          title: asString(mapped.title),
          category: asString(mapped.category),
          occurredAt,
          scheduledAt: asDateOrNull(mapped.scheduled_at),
          completedAt: asDateOrNull(mapped.completed_at),
          durationMinutes: asNumber(mapped.duration_minutes),
          valueAmount: asNumber(mapped.value_amount),
          currency: asString(mapped.currency),
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalJobEvents.tenantId,
            canonicalJobEvents.sourceConnectionId,
            canonicalJobEvents.externalRecordId,
          ],
          set: {
            employeeId: input.employeeId,
            branchId: input.branchId,
            siteId: input.siteId,
            customerId: input.customerId ?? null,
            projectId: input.projectId ?? null,
            eventType: asString(mapped.event_type) ?? "completed",
            status: asString(mapped.status),
            title: asString(mapped.title),
            category: asString(mapped.category),
            occurredAt,
            scheduledAt: asDateOrNull(mapped.scheduled_at),
            completedAt: asDateOrNull(mapped.completed_at),
            durationMinutes: asNumber(mapped.duration_minutes),
            valueAmount: asNumber(mapped.value_amount),
            currency: asString(mapped.currency),
            metadataJson: mapped,
            updatedAt: new Date(),
          },
        });
      return;
    }
    case "canonical_visit_event": {
      await db
        .insert(canonicalVisitEvents)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          employeeId: input.employeeId,
          branchId: input.branchId,
          siteId: input.siteId,
          customerId: input.customerId ?? null,
          checkInAt: asDateOrNull(mapped.check_in_at),
          checkOutAt: asDateOrNull(mapped.check_out_at),
          visitDurationMinutes: asNumber(mapped.visit_duration_minutes),
          visitStatus: asString(mapped.visit_status),
          revenueAmount: asNumber(mapped.revenue_amount),
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalVisitEvents.tenantId,
            canonicalVisitEvents.sourceConnectionId,
            canonicalVisitEvents.externalRecordId,
          ],
          set: {
            employeeId: input.employeeId,
            branchId: input.branchId,
            siteId: input.siteId,
            customerId: input.customerId ?? null,
            checkInAt: asDateOrNull(mapped.check_in_at),
            checkOutAt: asDateOrNull(mapped.check_out_at),
            visitDurationMinutes: asNumber(mapped.visit_duration_minutes),
            visitStatus: asString(mapped.visit_status),
            revenueAmount: asNumber(mapped.revenue_amount),
            metadataJson: mapped,
            updatedAt: new Date(),
          },
        });
      return;
    }
    case "canonical_task_event": {
      await db
        .insert(canonicalTaskEvents)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          employeeId: input.employeeId,
          assignedAt: asDateOrNull(mapped.assigned_at),
          completedAt: asDateOrNull(mapped.completed_at),
          dueAt: asDateOrNull(mapped.due_at),
          taskType: asString(mapped.task_type),
          priority: asString(mapped.priority),
          status: asString(mapped.status),
          points: asNumber(mapped.points),
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalTaskEvents.tenantId,
            canonicalTaskEvents.sourceConnectionId,
            canonicalTaskEvents.externalRecordId,
          ],
          set: {
            employeeId: input.employeeId,
            assignedAt: asDateOrNull(mapped.assigned_at),
            completedAt: asDateOrNull(mapped.completed_at),
            dueAt: asDateOrNull(mapped.due_at),
            taskType: asString(mapped.task_type),
            priority: asString(mapped.priority),
            status: asString(mapped.status),
            points: asNumber(mapped.points),
            metadataJson: mapped,
            updatedAt: new Date(),
          },
        });
      return;
    }
    case "canonical_sales_event": {
      await db
        .insert(canonicalSalesEvents)
        .values({
          tenantId,
          sourceConnectionId: connectionId,
          externalRecordId,
          employeeId: input.employeeId,
          branchId: input.branchId,
          customerId: input.customerId ?? null,
          eventDate: asDate(mapped.event_date),
          amount: asNumber(mapped.amount) ?? 0,
          currency: asString(mapped.currency),
          status: asString(mapped.status),
          metadataJson: mapped,
        })
        .onConflictDoUpdate({
          target: [
            canonicalSalesEvents.tenantId,
            canonicalSalesEvents.sourceConnectionId,
            canonicalSalesEvents.externalRecordId,
          ],
          set: {
            employeeId: input.employeeId,
            branchId: input.branchId,
            customerId: input.customerId ?? null,
            eventDate: asDate(mapped.event_date),
            amount: asNumber(mapped.amount) ?? 0,
            currency: asString(mapped.currency),
            status: asString(mapped.status),
            metadataJson: mapped,
            updatedAt: new Date(),
          },
        });
      return;
    }
    default:
      throw new Error(`Unsupported target entity ${input.targetEntity}`);
  }
}
