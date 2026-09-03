export const KPI_CATEGORY_IDS = [
  "goal_execution",
  "attendance_discipline",
  "productivity",
  "quality",
  "learning_development",
  "feedback_review",
] as const;

export type KpiCategoryId = (typeof KPI_CATEGORY_IDS)[number];

export const ROLE_TEMPLATE_IDS = [
  "sales",
  "driver",
  "coordinator",
  "admin",
  "general",
] as const;

export type RoleTemplateId = (typeof ROLE_TEMPLATE_IDS)[number];

export const KPI_UNITS = [
  "percent",
  "count",
  "currency",
  "minutes",
  "hours",
  "score",
  "ratio",
] as const;

export type KpiUnit = (typeof KPI_UNITS)[number];

export const KPI_STATUSES = [
  "on_track",
  "at_risk",
  "below_target",
  "exceeded",
  "missing",
] as const;

export type KpiStatus = (typeof KPI_STATUSES)[number];

export const KPI_TRENDS = ["up", "down", "flat", "new"] as const;
export type KpiTrend = (typeof KPI_TRENDS)[number];

export const REVIEW_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type ReviewCycle = (typeof REVIEW_CYCLES)[number];

export type KpiDirection = "higher" | "lower";

export type KpiEvidence = {
  id: string;
  label: string;
  source: string;
  recordedAt: string;
  notes?: string | null;
};

export type KpiHistoryPoint = {
  period: string;
  actualValue: number;
  targetValue: number | null;
  reviewDate: string;
  notes: string | null;
};

export type KpiThreshold = {
  minAcceptablePercent: number;
  atRiskPercent: number;
  optionalCap?: number;
};

export type KpiItem = {
  id: string;
  templateKey?: string;
  assignmentId?: string;
  kpiDefinitionId?: string;
  employeeId?: string | null;
  employeeName?: string;
  title: string;
  category: KpiCategoryId;
  roleScope: RoleTemplateId;
  description: string;
  targetValue: number | null;
  actualValue: number | null;
  unit: KpiUnit;
  weight: number;
  period: ReviewCycle;
  trend: KpiTrend;
  trendDelta: number | null;
  threshold: KpiThreshold;
  status: KpiStatus;
  owner: string;
  source: string;
  notes: string | null;
  evidence: KpiEvidence[];
  history: KpiHistoryPoint[];
  direction: KpiDirection;
  lastUpdated: string | null;
  dueAt: string | null;
  formula: string;
};

export type ScoredKpi = KpiItem & {
  achievementPercent: number | null;
  cappedAchievement: number | null;
  weightedScore: number | null;
  weightedContribution: number | null;
  incomplete: boolean;
};

export type CategoryScore = {
  id: KpiCategoryId;
  label: string;
  score: number | null;
  weight: number;
  kpiCount: number;
  metCount: number;
  missingCount: number;
};

export type BenchmarkSet = {
  previousPeriod: number | null;
  teamAverage: number | null;
  departmentAverage: number | null;
  companyAverage: number | null;
  roleAverage: number | null;
  percentile: number | null;
  rank: number | null;
  cohortSize: number;
};

export type KpiAlertKind =
  | "below_target"
  | "declining_trend"
  | "overdue_review"
  | "missing_data"
  | "expiring_development"
  | "training_incomplete";

export type KpiAlert = {
  id: string;
  kind: KpiAlertKind;
  severity: "low" | "medium" | "high";
  title: string;
  detail: string;
  kpiId?: string;
};

export type ManagerReview = {
  reviewer: string;
  date: string;
  rating: number | null;
  notes: string | null;
};

export type ReviewsModel = {
  managerReview: ManagerReview | null;
  selfAssessment: { date: string; notes: string; status: string } | null;
  peerFeedback: { count: number; summary: string } | null;
  appraisalStatus: "not_started" | "in_progress" | "completed" | "overdue";
  pipStatus: "none" | "recommended" | "active";
  trainingRecommendations: string[];
  nextReviewDate: string | null;
};

export type DashboardSummary = {
  overallPerformanceScore: number | null;
  previousOverall: number | null;
  overallDelta: number | null;
  goalCompletionRate: number | null;
  productivityScore: number | null;
  qualityScore: number | null;
  attendanceScore: number | null;
  riskCount: number;
  percentile: number | null;
  rank: number | null;
  cohortSize: number;
  incompleteCount: number;
  kpiCount: number;
};

export type PeriodWindow = {
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  cycle: ReviewCycle;
  label: string;
};

export type KpiFilters = {
  employeeId: string;
  department: string;
  role: RoleTemplateId | "";
  branchId: string;
  manager: string;
  cycle: ReviewCycle;
  from: string;
  to: string;
  search: string;
  category: KpiCategoryId | "";
  status: KpiStatus | "";
};

export type RoleTemplateKpi = {
  key: string;
  title: string;
  category: KpiCategoryId;
  description: string;
  targetValue: number;
  unit: KpiUnit;
  weight: number;
  period: ReviewCycle;
  threshold: KpiThreshold;
  owner: string;
  source: string;
  direction: KpiDirection;
  formula: string;
  actionRecommendations: string[];
};

export type RoleTemplate = {
  id: RoleTemplateId;
  label: string;
  department: string;
  summary: string;
  kpis: RoleTemplateKpi[];
};

export type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  jobRoles?: { id: string; name: string }[];
  branchId: string | null;
  status: string;
  avatarUrl?: string | null;
};

export type BranchOption = {
  id: string;
  name: string;
};

export type ApiKpiDefinition = {
  id: string;
  name: string;
  type: string;
  targetValue: number | null;
  reviewPeriod: string;
  description?: string | null;
};

export type ApiKpiScore = {
  id?: string;
  score: number;
  reviewDate: string;
  notes: string | null;
  reviewerUserId?: string;
};

export type ApiSummaryItem = {
  assignment: {
    id: string;
    kpiId?: string;
    employeeId?: string | null;
    dueAt: string | null;
    roleTarget?: string | null;
  };
  kpi: ApiKpiDefinition | null;
  scores: ApiKpiScore[];
};
