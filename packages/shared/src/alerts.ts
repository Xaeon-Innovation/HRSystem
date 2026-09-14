export const ALERT_CATEGORIES = [
  "employee",
  "leave",
  "kpi",
  "attendance",
  "payroll",
  "system",
  "custom",
] as const;
export type AlertCategory = (typeof ALERT_CATEGORIES)[number];

export const ALERT_URGENCIES = ["info", "warning", "critical"] as const;
export type AlertUrgency = (typeof ALERT_URGENCIES)[number];

export const ALERT_CHANNELS = ["in_app", "email", "digest"] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const ALERT_FREQUENCIES = [
  "instant",
  "daily_digest",
  "weekly_digest",
] as const;
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];

export const ALERT_RECIPIENTS = [
  "admin",
  "hr_manager",
  "direct_manager",
  "branch_manager",
  "employee",
] as const;
export type AlertRecipient = (typeof ALERT_RECIPIENTS)[number];

export const ALERT_RULE_KINDS = ["catalog", "custom"] as const;
export type AlertRuleKind = (typeof ALERT_RULE_KINDS)[number];

export const ALERT_SOURCES = [
  "leave",
  "attendance",
  "kpi",
  "employee",
  "payroll",
  "documents",
  "location",
] as const;
export type AlertSource = (typeof ALERT_SOURCES)[number];

export const ALERT_CONDITIONS = [
  "above",
  "below",
  "equal",
  "missing",
  "overdue",
  "unchanged_days",
  "trend_drop",
] as const;
export type AlertCondition = (typeof ALERT_CONDITIONS)[number];

export const ALERT_METRICS = [
  "leave_balance",
  "lateness_count",
  "kpi_score",
  "absences",
  "expiring_document_days",
  "pending_approvals",
  "location_inactivity",
] as const;
export type AlertMetric = (typeof ALERT_METRICS)[number];

export const ALERT_SCOPES = [
  "company",
  "branch",
  "department",
  "role",
  "employee",
] as const;
export type AlertScope = (typeof ALERT_SCOPES)[number];

export const ALERT_DURATION_UNITS = ["hours", "days", "months"] as const;
export type AlertDurationUnit = (typeof ALERT_DURATION_UNITS)[number];

export type CatalogAlert = {
  key: string;
  category: Exclude<AlertCategory, "custom">;
  name: string;
  description: string;
  defaultUrgency: AlertUrgency;
  defaultRecipients: AlertRecipient[];
  defaultChannels: AlertChannel[];
  defaultFrequency: AlertFrequency;
  defaultEnabled: boolean;
  escalateAfterHours?: number | null;
};

function event(
  key: string,
  category: CatalogAlert["category"],
  name: string,
  description: string,
  urgency: AlertUrgency,
  recipients: AlertRecipient[],
  extra?: Partial<
    Pick<
      CatalogAlert,
      | "defaultChannels"
      | "defaultFrequency"
      | "defaultEnabled"
      | "escalateAfterHours"
    >
  >,
): CatalogAlert {
  const enabled =
    extra?.defaultEnabled ?? (urgency === "critical" || urgency === "warning");
  const frequency =
    extra?.defaultFrequency ?? (urgency === "info" ? "daily_digest" : "instant");
  const channels =
    extra?.defaultChannels ??
    (urgency === "info" ? ["in_app", "digest"] : ["in_app", "email"]);
  return {
    key,
    category,
    name,
    description,
    defaultUrgency: urgency,
    defaultRecipients: recipients,
    defaultChannels: channels,
    defaultFrequency: frequency,
    defaultEnabled: enabled,
    escalateAfterHours: extra?.escalateAfterHours ?? null,
  };
}

export const ALERT_CATALOG: CatalogAlert[] = [
  event(
    "employee_added",
    "employee",
    "New employee added",
    "Notify when a new employee record is created so HR can complete onboarding.",
    "info",
    ["admin", "hr_manager"],
    { defaultEnabled: true },
  ),
  event(
    "profile_incomplete",
    "employee",
    "Profile incomplete",
    "Employee is missing required profile fields after hire.",
    "warning",
    ["employee", "hr_manager"],
  ),
  event(
    "probation_ending",
    "employee",
    "Probation ending",
    "Probation period is approaching its end date.",
    "warning",
    ["hr_manager", "direct_manager"],
  ),
  event(
    "contract_expiring",
    "employee",
    "Contract expiring",
    "An employment contract is nearing expiry and needs renewal or close-out.",
    "critical",
    ["admin", "hr_manager"],
  ),
  event(
    "missing_required_documents",
    "employee",
    "Missing required documents",
    "Onboarding or compliance documents have not been uploaded.",
    "warning",
    ["employee", "hr_manager"],
  ),
  event(
    "employee_status_changed",
    "employee",
    "Employee status changed",
    "An employee was activated, deactivated, or otherwise changed status.",
    "info",
    ["admin", "hr_manager"],
  ),
  event(
    "duplicate_employee_import",
    "employee",
    "Duplicate employee import issues",
    "A CSV or integration import flagged possible duplicate employee records.",
    "warning",
    ["admin"],
  ),

  event(
    "leave_request_submitted",
    "leave",
    "New leave request submitted",
    "An employee submitted a leave request that needs review.",
    "info",
    ["direct_manager", "admin"],
    { defaultEnabled: true, defaultFrequency: "instant", defaultChannels: ["in_app", "email"] },
  ),
  event(
    "leave_approved",
    "leave",
    "Leave approved",
    "A leave request was approved.",
    "info",
    ["employee"],
    { defaultEnabled: true, defaultFrequency: "instant", defaultChannels: ["in_app"] },
  ),
  event(
    "leave_rejected",
    "leave",
    "Leave rejected",
    "A leave request was rejected.",
    "warning",
    ["employee"],
    { defaultEnabled: true },
  ),
  event(
    "leave_pending_too_long",
    "leave",
    "Pending approval too long",
    "A leave request has waited past the expected approval window.",
    "warning",
    ["direct_manager", "admin"],
    { escalateAfterHours: 24 },
  ),
  event(
    "leave_balance_low",
    "leave",
    "Leave balance low",
    "An employee’s remaining leave has dropped below the warning threshold.",
    "warning",
    ["employee", "hr_manager"],
  ),
  event(
    "overlapping_leave",
    "leave",
    "Overlapping leave detected",
    "Approved or pending leave overlaps another booking for the same person.",
    "warning",
    ["direct_manager", "hr_manager"],
  ),
  event(
    "too_many_off_same_day",
    "leave",
    "Too many employees off on the same day",
    "Approved leave in a team or department exceeds the staffing threshold.",
    "warning",
    ["branch_manager", "admin"],
  ),
  event(
    "blackout_date_request",
    "leave",
    "Blackout-date request attempted",
    "Someone tried to book leave on a blackout or restricted date.",
    "warning",
    ["employee", "admin"],
  ),

  event(
    "kpi_below_target",
    "kpi",
    "KPI below target",
    "A scored KPI has fallen below its target.",
    "warning",
    ["employee", "direct_manager"],
  ),
  event(
    "kpi_trend_declining",
    "kpi",
    "KPI trend declining",
    "A KPI is trending down across consecutive review periods.",
    "warning",
    ["direct_manager"],
  ),
  event(
    "review_overdue",
    "kpi",
    "Review overdue",
    "A performance review or KPI check-in is past due.",
    "critical",
    ["direct_manager", "hr_manager"],
  ),
  event(
    "performance_cycle_starting",
    "kpi",
    "Performance cycle starting",
    "A new appraisal or KPI cycle is opening.",
    "info",
    ["employee", "direct_manager"],
    { defaultEnabled: true },
  ),
  event(
    "appraisal_submitted",
    "kpi",
    "Appraisal submitted",
    "An appraisal was submitted and is ready for the next step.",
    "info",
    ["hr_manager", "employee"],
    { defaultEnabled: true, defaultFrequency: "instant", defaultChannels: ["in_app"] },
  ),
  event(
    "appraisal_not_completed",
    "kpi",
    "Appraisal not completed by manager",
    "A manager has not completed an appraisal before the cycle deadline.",
    "warning",
    ["direct_manager", "hr_manager"],
    { escalateAfterHours: 48 },
  ),
  event(
    "employee_risk_zone",
    "kpi",
    "Employee entered risk zone",
    "Performance has crossed into a defined risk threshold.",
    "critical",
    ["hr_manager", "direct_manager"],
  ),

  event(
    "employee_absent_today",
    "attendance",
    "Employee absent today",
    "An employee did not check in and has no approved leave for today.",
    "warning",
    ["direct_manager", "hr_manager"],
  ),
  event(
    "repeated_lateness",
    "attendance",
    "Repeated lateness",
    "Late check-ins have crossed the warning count for the period.",
    "warning",
    ["direct_manager", "hr_manager"],
  ),
  event(
    "missed_check_in_out",
    "attendance",
    "Missed check-in/out",
    "A required clock-in or clock-out was missed.",
    "warning",
    ["employee", "direct_manager"],
    { defaultEnabled: true },
  ),
  event(
    "overtime_threshold",
    "attendance",
    "Overtime threshold reached",
    "Worked hours have reached the overtime warning or limit.",
    "warning",
    ["hr_manager", "admin"],
  ),
  event(
    "suspicious_attendance",
    "attendance",
    "Suspicious attendance pattern",
    "Check-in location, timing, or frequency looks unusual.",
    "critical",
    ["admin", "hr_manager"],
  ),
  event(
    "noshow_without_request",
    "attendance",
    "No-show without request",
    "An employee was absent with no leave request on file.",
    "critical",
    ["direct_manager", "hr_manager"],
  ),

  event(
    "payroll_cutoff_approaching",
    "payroll",
    "Payroll cutoff approaching",
    "The payroll input window is closing.",
    "warning",
    ["admin", "hr_manager"],
  ),
  event(
    "missing_payroll_input",
    "payroll",
    "Missing payroll input",
    "Required payroll data is still missing before cutoff.",
    "critical",
    ["hr_manager", "admin"],
  ),
  event(
    "license_document_expiry",
    "payroll",
    "License/document expiry",
    "A license or required document is about to expire.",
    "critical",
    ["employee", "hr_manager"],
  ),
  event(
    "certification_expiry",
    "payroll",
    "Certification expiry",
    "A professional certification is nearing its expiry date.",
    "warning",
    ["employee", "hr_manager"],
  ),
  event(
    "policy_acknowledgment_overdue",
    "payroll",
    "Policy acknowledgment overdue",
    "An employee has not acknowledged a required policy in time.",
    "warning",
    ["employee", "hr_manager"],
  ),
  event(
    "contract_renewal_due",
    "payroll",
    "Contract renewal due",
    "A contract renewal decision is due.",
    "warning",
    ["hr_manager", "admin"],
  ),

  event(
    "csv_import_failed",
    "system",
    "CSV import failed",
    "A file import did not complete successfully.",
    "critical",
    ["admin"],
    { defaultEnabled: true },
  ),
  event(
    "integration_sync_failed",
    "system",
    "Integration sync failed",
    "A connected system sync failed or stalled.",
    "critical",
    ["admin"],
    { defaultEnabled: true },
  ),
  event(
    "email_delivery_failed",
    "system",
    "Email delivery failed",
    "An outbound email could not be delivered.",
    "warning",
    ["admin"],
    { defaultEnabled: false },
  ),
  event(
    "webhook_failure",
    "system",
    "Webhook failure",
    "An inbound or outbound webhook did not process.",
    "critical",
    ["admin"],
  ),
  event(
    "storage_nearly_full",
    "system",
    "Storage nearly full",
    "File or log storage is approaching capacity.",
    "warning",
    ["admin"],
    { defaultEnabled: false },
  ),
  event(
    "suspicious_login",
    "system",
    "Suspicious login",
    "A login looks unusual based on location, device, or frequency.",
    "critical",
    ["admin", "employee"],
  ),
  event(
    "role_permission_changed",
    "system",
    "Role permission changed",
    "A user’s role or access was changed.",
    "warning",
    ["admin"],
    { defaultEnabled: true },
  ),
];

export const ALERT_CATEGORY_META: Record<
  AlertCategory,
  { label: string; blurb: string }
> = {
  employee: {
    label: "Employee",
    blurb: "Lifecycle milestones, onboarding gaps, and record changes.",
  },
  leave: {
    label: "Leave",
    blurb: "Requests, approvals, delays, balances, and staffing clashes.",
  },
  kpi: {
    label: "KPI & performance",
    blurb: "Targets, trends, review deadlines, and risk-zone scores.",
  },
  attendance: {
    label: "Attendance",
    blurb: "Absences, lateness, missed punches, overtime, and no-shows.",
  },
  payroll: {
    label: "Payroll & compliance",
    blurb: "Cutoffs, missing inputs, licences, certifications, and renewals.",
  },
  system: {
    label: "System & admin",
    blurb: "Imports, syncs, delivery failures, storage, and access changes.",
  },
  custom: {
    label: "Custom",
    blurb: "Threshold rules you define on leave, attendance, KPIs, and more.",
  },
};

export const ALERT_URGENCY_META: Record<AlertUrgency, { label: string }> = {
  info: { label: "Info" },
  warning: { label: "Warning" },
  critical: { label: "Critical" },
};

export const ALERT_CHANNEL_META: Record<AlertChannel, { label: string; hint: string }> =
  {
    in_app: { label: "In-app", hint: "Show in the Alerts inbox" },
    email: { label: "Email", hint: "Send an immediate email" },
    digest: { label: "Digest email", hint: "Include in the summary email" },
  };

export const ALERT_FREQUENCY_META: Record<
  AlertFrequency,
  { label: string; hint: string }
> = {
  instant: { label: "Instant", hint: "Notify as soon as the event happens" },
  daily_digest: { label: "Daily digest", hint: "Batch into one email per day" },
  weekly_digest: {
    label: "Weekly digest",
    hint: "Batch into one email per week",
  },
};

export const ALERT_RECIPIENT_META: Record<
  AlertRecipient,
  { label: string }
> = {
  admin: { label: "Admin" },
  hr_manager: { label: "HR manager" },
  direct_manager: { label: "Direct manager" },
  branch_manager: { label: "Branch manager" },
  employee: { label: "Employee" },
};

export const ALERT_SOURCE_META: Record<AlertSource, { label: string; category: AlertCategory }> =
  {
    leave: { label: "Leave", category: "leave" },
    attendance: { label: "Attendance", category: "attendance" },
    kpi: { label: "KPI", category: "kpi" },
    employee: { label: "Employee records", category: "employee" },
    payroll: { label: "Payroll", category: "payroll" },
    documents: { label: "Documents", category: "payroll" },
    location: { label: "Location tracking", category: "attendance" },
  };

export const ALERT_CONDITION_META: Record<AlertCondition, { label: string }> = {
  above: { label: "Above" },
  below: { label: "Below" },
  equal: { label: "Equal to" },
  missing: { label: "Missing" },
  overdue: { label: "Overdue" },
  unchanged_days: { label: "Unchanged for X time" },
  trend_drop: { label: "Trend drop" },
};

export const ALERT_METRIC_META: Record<
  AlertMetric,
  { label: string; unit: string; sources: AlertSource[] }
> = {
  leave_balance: {
    label: "Leave balance",
    unit: "days",
    sources: ["leave"],
  },
  lateness_count: {
    label: "Lateness count",
    unit: "times",
    sources: ["attendance"],
  },
  kpi_score: {
    label: "KPI score",
    unit: "points",
    sources: ["kpi"],
  },
  absences: {
    label: "Absences",
    unit: "days",
    sources: ["attendance", "leave"],
  },
  expiring_document_days: {
    label: "Days until document expiry",
    unit: "days",
    sources: ["documents", "employee", "payroll"],
  },
  pending_approvals: {
    label: "Pending approvals",
    unit: "requests",
    sources: ["leave"],
  },
  location_inactivity: {
    label: "Location inactivity",
    unit: "hours",
    sources: ["location", "attendance"],
  },
};

export const ALERT_SCOPE_META: Record<AlertScope, { label: string }> = {
  company: { label: "Whole company" },
  branch: { label: "One branch" },
  department: { label: "One department" },
  role: { label: "One role" },
  employee: { label: "One employee" },
};

export const ALERT_DURATION_UNIT_META: Record<
  AlertDurationUnit,
  { label: string }
> = {
  hours: { label: "Hours" },
  days: { label: "Days" },
  months: { label: "Months" },
};

export const ALERT_TEMPLATE_FIELDS = [
  { key: "employee_name", label: "Employee name" },
  { key: "department", label: "Department" },
  { key: "branch", label: "Branch" },
  { key: "date", label: "Date" },
  { key: "metric_value", label: "Metric value" },
  { key: "threshold", label: "Threshold" },
  { key: "title", label: "Alert title" },
] as const;

export type CustomAlertExample = {
  name: string;
  source: AlertSource;
  metric: AlertMetric;
  condition: AlertCondition;
  threshold: number | null;
  durationValue: number | null;
  durationUnit: AlertDurationUnit | null;
  scope: AlertScope;
  urgency: AlertUrgency;
  recipients: AlertRecipient[];
  channels: AlertChannel[];
  frequency: AlertFrequency;
  titleTemplate: string;
  bodyTemplate: string;
};

export const CUSTOM_ALERT_EXAMPLES: CustomAlertExample[] = [
  {
    name: "Low annual leave balance",
    source: "leave",
    metric: "leave_balance",
    condition: "below",
    threshold: 3,
    durationValue: null,
    durationUnit: null,
    scope: "company",
    urgency: "warning",
    recipients: ["hr_manager"],
    channels: ["in_app", "email"],
    frequency: "instant",
    titleTemplate: "Leave balance low for {{employee_name}}",
    bodyTemplate:
      "{{employee_name}} in {{department}} has {{metric_value}} days of annual leave remaining (threshold {{threshold}}).",
  },
  {
    name: "Too many off in one department",
    source: "leave",
    metric: "absences",
    condition: "above",
    threshold: 4,
    durationValue: null,
    durationUnit: null,
    scope: "department",
    urgency: "warning",
    recipients: ["branch_manager", "admin"],
    channels: ["in_app", "email"],
    frequency: "instant",
    titleTemplate: "Staffing clash on {{date}}",
    bodyTemplate:
      "More than {{threshold}} employees in {{department}} are approved off on {{date}} (currently {{metric_value}}).",
  },
  {
    name: "KPI below 60 for two months",
    source: "kpi",
    metric: "kpi_score",
    condition: "trend_drop",
    threshold: 60,
    durationValue: 2,
    durationUnit: "months",
    scope: "company",
    urgency: "critical",
    recipients: ["direct_manager", "hr_manager"],
    channels: ["in_app", "email"],
    frequency: "instant",
    titleTemplate: "{{employee_name}} KPI below {{threshold}}",
    bodyTemplate:
      "{{employee_name}} scored {{metric_value}} for {{threshold}} across {{date}}. Manager follow-up is due.",
  },
  {
    name: "Driver location stale on shift",
    source: "location",
    metric: "location_inactivity",
    condition: "unchanged_days",
    threshold: null,
    durationValue: 2,
    durationUnit: "hours",
    scope: "role",
    urgency: "critical",
    recipients: ["admin", "branch_manager"],
    channels: ["in_app", "email"],
    frequency: "instant",
    titleTemplate: "No location update from {{employee_name}}",
    bodyTemplate:
      "{{employee_name}} has not sent a location ping for {{metric_value}} during an active shift.",
  },
];

const catalogByKey = new Map(ALERT_CATALOG.map((item) => [item.key, item]));

export function getCatalogAlert(key: string): CatalogAlert | undefined {
  return catalogByKey.get(key);
}

export function categoryFromNotificationType(
  type: string,
): AlertCategory | null {
  switch (type) {
    case "clock_in":
    case "clock_out":
    case "missed_clock_out":
      return "attendance";
    case "kpi_due":
      return "kpi";
    case "announcement":
      return "system";
    default:
      return null;
  }
}

export function urgencyFromNotificationType(type: string): AlertUrgency {
  if (type === "missed_clock_out" || type === "kpi_due") return "warning";
  return "info";
}

export function eventKeyFromNotificationType(type: string): string | null {
  if (type === "missed_clock_out") return "missed_check_in_out";
  if (type === "announcement") return "announcement";
  if (type === "kpi_due") return "review_overdue";
  if (type === "clock_in" || type === "clock_out") return type;
  return null;
}

export function interpolateAlertTemplate(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const value = vars[key];
    if (value == null || value === "") return "-";
    return String(value);
  });
}

export function metricsForSource(source: AlertSource): AlertMetric[] {
  return ALERT_METRICS.filter((metric) =>
    ALERT_METRIC_META[metric].sources.includes(source),
  );
}

export function categoryForSource(source: AlertSource): AlertCategory {
  return ALERT_SOURCE_META[source].category;
}
