import { eq } from "drizzle-orm";
import { alertRules } from "@hr/db";
import {
  ALERT_CATALOG,
  categoryForSource,
  type CreateCustomAlertRuleInput,
} from "@hr/shared";
import type { App } from "../types.js";

export async function ensureCatalogRules(app: App, tenantId: string) {
  const existing = await app.db.query.alertRules.findMany({
    where: eq(alertRules.tenantId, tenantId),
  });
  const have = new Set(
    existing.filter((row) => row.kind === "catalog").map((row) => row.eventKey),
  );
  const missing = ALERT_CATALOG.filter((item) => !have.has(item.key));
  if (missing.length > 0) {
    await app.db.insert(alertRules).values(
      missing.map((item) => ({
        tenantId,
        kind: "catalog" as const,
        eventKey: item.key,
        category: item.category,
        name: item.name,
        description: item.description,
        enabled: item.defaultEnabled,
        urgency: item.defaultUrgency,
        channels: item.defaultChannels,
        frequency: item.defaultFrequency,
        recipients: item.defaultRecipients,
        escalateAfterHours: item.escalateAfterHours ?? null,
      })),
    );
  }
  return app.db.query.alertRules.findMany({
    where: eq(alertRules.tenantId, tenantId),
  });
}

export function customRuleValues(
  tenantId: string,
  input: CreateCustomAlertRuleInput,
  eventKey: string,
) {
  return {
    tenantId,
    kind: "custom" as const,
    eventKey,
    category: categoryForSource(input.source),
    name: input.name,
    description: input.description ?? null,
    enabled: input.enabled ?? true,
    urgency: input.urgency,
    channels: input.channels,
    frequency: input.frequency,
    recipients: input.recipients,
    escalateAfterHours: input.escalateAfterHours ?? null,
    source: input.source,
    condition: input.condition,
    metric: input.metric,
    threshold: input.threshold ?? null,
    durationValue: input.durationValue ?? null,
    durationUnit: input.durationUnit ?? null,
    scope: input.scope,
    scopeId: input.scopeId ?? null,
    titleTemplate: input.titleTemplate,
    bodyTemplate: input.bodyTemplate,
  };
}
