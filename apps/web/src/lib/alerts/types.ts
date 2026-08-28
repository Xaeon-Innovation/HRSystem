import type {
  AlertCategory,
  AlertChannel,
  AlertCondition,
  AlertDurationUnit,
  AlertFrequency,
  AlertMetric,
  AlertRecipient,
  AlertRuleKind,
  AlertScope,
  AlertSource,
  AlertUrgency,
} from "@hr/shared";

export type InboxNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  category: AlertCategory | null;
  urgency: AlertUrgency | null;
  eventKey: string | null;
  createdAt: string;
};

export type AlertRule = {
  id: string;
  kind: AlertRuleKind;
  eventKey: string;
  category: AlertCategory;
  name: string;
  description: string | null;
  enabled: boolean;
  urgency: AlertUrgency;
  channels: AlertChannel[];
  frequency: AlertFrequency;
  recipients: AlertRecipient[];
  escalateAfterHours: number | null;
  source: AlertSource | null;
  condition: AlertCondition | null;
  metric: AlertMetric | null;
  threshold: number | null;
  durationValue: number | null;
  durationUnit: AlertDurationUnit | null;
  scope: AlertScope | null;
  scopeId: string | null;
  titleTemplate: string | null;
  bodyTemplate: string | null;
  createdAt: string;
  updatedAt: string;
};
