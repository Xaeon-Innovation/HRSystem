import type { RoleTemplate, RoleTemplateId } from "./types";

const cap120 = { minAcceptablePercent: 80, atRiskPercent: 90, optionalCap: 120 };

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "sales",
    label: "Sales",
    department: "Sales",
    summary:
      "Revenue, conversion, activity, and collections for quota-carrying roles.",
    kpis: [
      {
        key: "sales.revenue",
        title: "Revenue achieved",
        category: "goal_execution",
        description: "Closed revenue versus assigned quota for the review period.",
        targetValue: 100000,
        unit: "currency",
        weight: 25,
        period: "monthly",
        threshold: cap120,
        owner: "Sales manager",
        source: "CRM / sales ledger",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 25",
        actionRecommendations: [
          "Review open pipeline coverage for the next 30 days",
          "Rebalance accounts with stalled opportunities",
        ],
      },
      {
        key: "sales.conversion",
        title: "Conversion rate",
        category: "quality",
        description: "Share of qualified leads that convert to won deals.",
        targetValue: 25,
        unit: "percent",
        weight: 20,
        period: "monthly",
        threshold: cap120,
        owner: "Sales manager",
        source: "CRM funnel",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 20",
        actionRecommendations: [
          "Audit lost-deal reasons from the last cycle",
          "Pair with a top converter for call reviews",
        ],
      },
      {
        key: "sales.calls",
        title: "Calls made",
        category: "productivity",
        description: "Outbound and follow-up calls completed in the period.",
        targetValue: 80,
        unit: "count",
        weight: 15,
        period: "monthly",
        threshold: cap120,
        owner: "Sales manager",
        source: "Dialer / CRM activity",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 15",
        actionRecommendations: [
          "Protect a daily prospecting block on the calendar",
        ],
      },
      {
        key: "sales.deals",
        title: "Deals closed",
        category: "goal_execution",
        description: "Won opportunities counted in the review window.",
        targetValue: 8,
        unit: "count",
        weight: 25,
        period: "monthly",
        threshold: cap120,
        owner: "Sales manager",
        source: "CRM",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 25",
        actionRecommendations: [
          "Advance two late-stage deals with a manager-assisted close plan",
        ],
      },
      {
        key: "sales.collection",
        title: "Collection rate",
        category: "quality",
        description: "Invoices collected versus invoices due in the period.",
        targetValue: 95,
        unit: "percent",
        weight: 15,
        period: "monthly",
        threshold: { minAcceptablePercent: 85, atRiskPercent: 92, optionalCap: 110 },
        owner: "Finance partner",
        source: "Billing / ERP",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 110) × 15",
        actionRecommendations: [
          "Escalate overdue invoices older than 14 days",
        ],
      },
    ],
  },
  {
    id: "driver",
    label: "Driver",
    department: "Field operations",
    summary: "Trips, punctuality, safety, attendance, and customer rating.",
    kpis: [
      {
        key: "driver.trips",
        title: "Trips completed",
        category: "productivity",
        description: "Assigned trips completed in the review period.",
        targetValue: 40,
        unit: "count",
        weight: 20,
        period: "monthly",
        threshold: cap120,
        owner: "Fleet supervisor",
        source: "Dispatch / jobs",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 20",
        actionRecommendations: [
          "Check route density and idle time between jobs",
        ],
      },
      {
        key: "driver.ontime",
        title: "On-time rate",
        category: "quality",
        description: "Trips arriving within the SLA window.",
        targetValue: 95,
        unit: "percent",
        weight: 25,
        period: "monthly",
        threshold: { minAcceptablePercent: 85, atRiskPercent: 92, optionalCap: 110 },
        owner: "Fleet supervisor",
        source: "Dispatch timestamps",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 110) × 25",
        actionRecommendations: [
          "Review late trips for traffic, staging, or handoff delays",
        ],
      },
      {
        key: "driver.attendance",
        title: "Attendance",
        category: "attendance_discipline",
        description: "Present days versus scheduled days.",
        targetValue: 98,
        unit: "percent",
        weight: 20,
        period: "monthly",
        threshold: { minAcceptablePercent: 90, atRiskPercent: 95, optionalCap: 100 },
        owner: "HR / supervisor",
        source: "Attendance",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 100) × 20",
        actionRecommendations: [
          "Discuss unplanned absences and confirm upcoming roster",
        ],
      },
      {
        key: "driver.incidents",
        title: "Incident count",
        category: "attendance_discipline",
        description: "Safety or service incidents. Lower is better.",
        targetValue: 1,
        unit: "count",
        weight: 20,
        period: "monthly",
        threshold: { minAcceptablePercent: 80, atRiskPercent: 90, optionalCap: 150 },
        owner: "Safety officer",
        source: "Incident log",
        direction: "lower",
        formula:
          "achievementPercent = targetValue / actualValue × 100 (lower is better); weightedScore = min(achievementPercent, 150) × 20",
        actionRecommendations: [
          "Schedule a safety briefing if any incident is still open",
        ],
      },
      {
        key: "driver.rating",
        title: "Customer rating",
        category: "feedback_review",
        description: "Average customer rating for completed trips.",
        targetValue: 4.6,
        unit: "score",
        weight: 15,
        period: "monthly",
        threshold: { minAcceptablePercent: 85, atRiskPercent: 92, optionalCap: 110 },
        owner: "Fleet supervisor",
        source: "Customer feedback",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 110) × 15",
        actionRecommendations: [
          "Coach on the lowest-rated trip comments from this cycle",
        ],
      },
    ],
  },
  {
    id: "coordinator",
    label: "Coordinator",
    department: "Operations",
    summary: "Task completion, SLA speed, document quality, and issue handling.",
    kpis: [
      {
        key: "coordinator.tasks",
        title: "Task completion rate",
        category: "goal_execution",
        description: "Assigned coordination tasks completed on time.",
        targetValue: 96,
        unit: "percent",
        weight: 30,
        period: "monthly",
        threshold: cap120,
        owner: "Operations manager",
        source: "Task board",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 30",
        actionRecommendations: [
          "Clear the oldest blocked tasks in the next stand-up",
        ],
      },
      {
        key: "coordinator.sla",
        title: "SLA response time",
        category: "productivity",
        description: "Average first-response time. Lower is better.",
        targetValue: 30,
        unit: "minutes",
        weight: 25,
        period: "monthly",
        threshold: cap120,
        owner: "Operations manager",
        source: "Ticketing / dispatch",
        direction: "lower",
        formula:
          "achievementPercent = targetValue / actualValue × 100 (lower is better); weightedScore = min(achievementPercent, 120) × 25",
        actionRecommendations: [
          "Add an after-hours coverage rule for peak request hours",
        ],
      },
      {
        key: "coordinator.accuracy",
        title: "Document accuracy",
        category: "quality",
        description: "Files processed without correction on first pass.",
        targetValue: 98,
        unit: "percent",
        weight: 25,
        period: "monthly",
        threshold: { minAcceptablePercent: 90, atRiskPercent: 95, optionalCap: 110 },
        owner: "Quality lead",
        source: "Document QA",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 110) × 25",
        actionRecommendations: [
          "Add a two-point checklist on the most common error type",
        ],
      },
      {
        key: "coordinator.resolution",
        title: "Issue resolution time",
        category: "quality",
        description: "Average hours to close an escalated issue. Lower is better.",
        targetValue: 8,
        unit: "hours",
        weight: 20,
        period: "monthly",
        threshold: cap120,
        owner: "Operations manager",
        source: "Issue tracker",
        direction: "lower",
        formula:
          "achievementPercent = targetValue / actualValue × 100 (lower is better); weightedScore = min(achievementPercent, 120) × 20",
        actionRecommendations: [
          "Define an escalation owner for issues open longer than SLA",
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Admin / back office",
    department: "Administration",
    summary: "Accuracy, turnaround, attendance, and mandatory compliance.",
    kpis: [
      {
        key: "admin.accuracy",
        title: "Processing accuracy",
        category: "quality",
        description: "Back-office items processed correctly on first pass.",
        targetValue: 99,
        unit: "percent",
        weight: 30,
        period: "monthly",
        threshold: { minAcceptablePercent: 95, atRiskPercent: 97, optionalCap: 110 },
        owner: "Office manager",
        source: "QA sample",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 110) × 30",
        actionRecommendations: [
          "Review the last five exceptions with the processor",
        ],
      },
      {
        key: "admin.turnaround",
        title: "Turnaround time",
        category: "productivity",
        description: "Average hours to complete a standard request. Lower is better.",
        targetValue: 24,
        unit: "hours",
        weight: 25,
        period: "monthly",
        threshold: cap120,
        owner: "Office manager",
        source: "Request queue",
        direction: "lower",
        formula:
          "achievementPercent = targetValue / actualValue × 100 (lower is better); weightedScore = min(achievementPercent, 120) × 25",
        actionRecommendations: [
          "Split same-day vs. standard queues to protect SLA",
        ],
      },
      {
        key: "admin.attendance",
        title: "Attendance",
        category: "attendance_discipline",
        description: "Present days versus scheduled days.",
        targetValue: 98,
        unit: "percent",
        weight: 20,
        period: "monthly",
        threshold: { minAcceptablePercent: 90, atRiskPercent: 95, optionalCap: 100 },
        owner: "HR",
        source: "Attendance",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 100) × 20",
        actionRecommendations: [
          "Confirm leave balances and coverage plan",
        ],
      },
      {
        key: "admin.compliance",
        title: "Compliance completion",
        category: "learning_development",
        description: "Required policy and training modules completed.",
        targetValue: 100,
        unit: "percent",
        weight: 25,
        period: "quarterly",
        threshold: { minAcceptablePercent: 100, atRiskPercent: 100, optionalCap: 100 },
        owner: "Compliance",
        source: "LMS / policy tracker",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 100) × 25",
        actionRecommendations: [
          "Assign remaining mandatory modules with a completion date",
        ],
      },
    ],
  },
  {
    id: "general",
    label: "General",
    department: "General",
    summary: "Balanced goals, attendance, output, quality, and development.",
    kpis: [
      {
        key: "general.goals",
        title: "Goal completion",
        category: "goal_execution",
        description: "Agreed goals completed in the review cycle.",
        targetValue: 100,
        unit: "percent",
        weight: 30,
        period: "monthly",
        threshold: cap120,
        owner: "Direct manager",
        source: "Goal tracker",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 30",
        actionRecommendations: [
          "Rewrite any goal that cannot be evidenced this cycle",
        ],
      },
      {
        key: "general.attendance",
        title: "Attendance",
        category: "attendance_discipline",
        description: "Present days versus scheduled days.",
        targetValue: 98,
        unit: "percent",
        weight: 20,
        period: "monthly",
        threshold: { minAcceptablePercent: 90, atRiskPercent: 95, optionalCap: 100 },
        owner: "HR",
        source: "Attendance",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 100) × 20",
        actionRecommendations: ["Review punctuality exceptions with the employee"],
      },
      {
        key: "general.productivity",
        title: "Productivity score",
        category: "productivity",
        description: "Output versus expected workload for the role.",
        targetValue: 100,
        unit: "score",
        weight: 25,
        period: "monthly",
        threshold: cap120,
        owner: "Direct manager",
        source: "Operations analytics",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 25",
        actionRecommendations: ["Identify the top time drain in the last two weeks"],
      },
      {
        key: "general.quality",
        title: "Quality score",
        category: "quality",
        description: "Work accepted without rework.",
        targetValue: 95,
        unit: "percent",
        weight: 15,
        period: "monthly",
        threshold: cap120,
        owner: "Direct manager",
        source: "QA / review",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 120) × 15",
        actionRecommendations: ["Sample five recent deliverables for defect patterns"],
      },
      {
        key: "general.learning",
        title: "Development goals",
        category: "learning_development",
        description: "Agreed learning actions completed this cycle.",
        targetValue: 100,
        unit: "percent",
        weight: 10,
        period: "quarterly",
        threshold: { minAcceptablePercent: 70, atRiskPercent: 85, optionalCap: 100 },
        owner: "Direct manager",
        source: "Learning plan",
        direction: "higher",
        formula:
          "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, 100) × 10",
        actionRecommendations: ["Book the next skill session before the review date"],
      },
    ],
  },
];

export function templateById(id: RoleTemplateId): RoleTemplate {
  return ROLE_TEMPLATES.find((t) => t.id === id) ?? ROLE_TEMPLATES[4]!;
}

export function inferRoleTemplate(
  jobTitle: string | null | undefined,
  extra?: string | string[] | null,
): RoleTemplateId {
  const extraText = Array.isArray(extra) ? extra.join(" ") : extra ?? "";
  const t = `${jobTitle ?? ""} ${extraText}`.toLowerCase();
  if (/sales|account exec|business development|\bbd\b|quota/.test(t)) {
    return "sales";
  }
  if (/driver|courier|fleet|delivery|captain/.test(t)) return "driver";
  if (/coordinat|dispatcher|ops officer|operations officer/.test(t)) {
    return "coordinator";
  }
  if (/admin|back office|hr |human resource|accountant|clerk|receptionist/.test(t)) {
    return "admin";
  }
  return "general";
}

export function departmentForRole(role: RoleTemplateId): string {
  return templateById(role).department;
}

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchTemplateKpi(name: string, role?: RoleTemplateId) {
  const needle = normalizeName(name);
  const pools = role
    ? [templateById(role)]
    : ROLE_TEMPLATES;
  for (const template of pools) {
    for (const kpi of template.kpis) {
      const title = normalizeName(kpi.title);
      if (title === needle || needle.includes(title) || title.includes(needle)) {
        return { template, kpi };
      }
    }
  }
  return null;
}

export function recommendationsFor(
  templateKey: string | undefined,
  roleScope: RoleTemplateId,
): string[] {
  if (!templateKey) return [];
  const kpi = templateById(roleScope).kpis.find((k) => k.key === templateKey);
  return kpi?.actionRecommendations ?? [];
}
