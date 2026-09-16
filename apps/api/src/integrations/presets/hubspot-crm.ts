import type { IntegrationConnectorConfig } from "@hr/db";
import type { PresetFieldMapping } from "./types.js";

export const HUBSPOT_CRM_PRESET = "hubspot_crm" as const;

export const HUBSPOT_CRM_DEFAULT_BASE_URL = "https://api.hubapi.com";

export const hubspotCrmConnectorConfig: IntegrationConnectorConfig = {
  preset: HUBSPOT_CRM_PRESET,
  authStrategy: "oauth2",
  pagination: {
    type: "cursor",
    cursorParam: "after",
    cursorPath: "paging.next.after",
  },
  entities: [
    {
      sourceEntity: "deal",
      path: "/crm/v3/objects/deals?limit=100&properties=dealname,amount,dealstage,closedate,hubspot_owner_id",
      itemsPath: "results",
      idField: "id",
      eventType: "deal",
    },
  ],
};

export const hubspotCrmMappings: PresetFieldMapping[] = [
  {
    sourceEntity: "deal",
    sourceField: "id",
    targetEntity: "canonical_sales_event",
    targetField: "external_record_id",
    isRequired: true,
  },
  {
    sourceEntity: "deal",
    sourceField: "properties.hubspot_owner_id",
    targetEntity: "canonical_sales_event",
    targetField: "employee_external_key",
  },
  {
    sourceEntity: "deal",
    sourceField: "properties.amount",
    targetEntity: "canonical_sales_event",
    targetField: "amount",
    transformType: "number_parse",
  },
  {
    sourceEntity: "deal",
    sourceField: "properties.dealstage",
    targetEntity: "canonical_sales_event",
    targetField: "status",
  },
  {
    sourceEntity: "deal",
    sourceField: "properties.closedate",
    targetEntity: "canonical_sales_event",
    targetField: "event_date",
    transformType: "date_parse",
  },
];
