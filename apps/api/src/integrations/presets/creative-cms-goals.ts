import type { IntegrationConnectorConfig } from "@hr/db";
import type { PresetFieldMapping } from "./types.js";

export const CREATIVE_CMS_GOALS_PRESET = "creative_cms_goals" as const;

export const CREATIVE_CMS_GOALS_DEFAULT_BASE_URL =
  "https://api.creativeintelligent.ae/api/v1";

export type { PresetFieldMapping };

export const creativeCmsGoalsConnectorConfig: IntegrationConnectorConfig = {
  preset: CREATIVE_CMS_GOALS_PRESET,
  authStrategy: "cms_jwt",
  entities: [
    {
      sourceEntity: "goal",
      path: "/target-management?isActive=true",
      itemsPath: "targets",
      idField: "id",
    },
    {
      sourceEntity: "goal_analysis",
      path: "/target/analysis",
      itemsPath: "data",
      idField: "employeeId",
    },
  ],
};

export const creativeCmsGoalsMappings: PresetFieldMapping[] = [
  {
    sourceEntity: "goal",
    sourceField: "id",
    targetEntity: "canonical_job_event",
    targetField: "external_record_id",
    isRequired: true,
  },
  {
    sourceEntity: "goal",
    sourceField: "assignedToId",
    targetEntity: "canonical_job_event",
    targetField: "employee_external_key",
    isRequired: true,
  },
  {
    sourceEntity: "goal",
    sourceField: "description",
    targetEntity: "canonical_job_event",
    targetField: "title",
  },
  {
    sourceEntity: "goal",
    sourceField: "category",
    targetEntity: "canonical_job_event",
    targetField: "category",
  },
  {
    sourceEntity: "goal",
    sourceField: "type",
    targetEntity: "canonical_job_event",
    targetField: "event_type",
  },
  {
    sourceEntity: "goal",
    sourceField: "startDate",
    targetEntity: "canonical_job_event",
    targetField: "scheduled_at",
    transformType: "date_parse",
  },
  {
    sourceEntity: "goal",
    sourceField: "endDate",
    targetEntity: "canonical_job_event",
    targetField: "occurred_at",
    transformType: "date_parse",
  },
  {
    sourceEntity: "goal",
    sourceField: "completedAt",
    targetEntity: "canonical_job_event",
    targetField: "completed_at",
    transformType: "date_parse",
  },
  {
    sourceEntity: "goal",
    sourceField: "currentValue",
    targetEntity: "canonical_job_event",
    targetField: "value_amount",
    transformType: "number_parse",
  },
  {
    sourceEntity: "goal",
    sourceField: "isActive",
    targetEntity: "canonical_job_event",
    targetField: "status",
  },
  {
    sourceEntity: "goal_analysis",
    sourceField: "employeeId",
    targetEntity: "canonical_job_event",
    targetField: "external_record_id",
    isRequired: true,
  },
  {
    sourceEntity: "goal_analysis",
    sourceField: "employeeId",
    targetEntity: "canonical_job_event",
    targetField: "employee_external_key",
    isRequired: true,
  },
  {
    sourceEntity: "goal_analysis",
    sourceField: "overallPerformance.completionRate",
    targetEntity: "canonical_job_event",
    targetField: "value_amount",
    transformType: "number_parse",
  },
  {
    sourceEntity: "goal_analysis",
    sourceField: "monthlyTarget.status",
    targetEntity: "canonical_job_event",
    targetField: "status",
  },
];
