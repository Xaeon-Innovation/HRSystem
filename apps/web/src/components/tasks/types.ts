export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus =
  | "open"
  | "in_progress"
  | "submitted"
  | "changes_requested"
  | "completed"
  | "cancelled";
export type TaskAssignmentMode = "shared" | "individual";
export type TaskDeliverableType = "report" | "docs" | "screenshots" | "other";

export type TaskAssignee = {
  employeeId: string;
  name: string;
  userId: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  requiresReview: boolean;
  assignmentMode: TaskAssignmentMode;
  batchId: string | null;
  tags: string[];
  assignees: TaskAssignee[];
  createdAt: string;
  updatedAt: string;
};

export type TaskAttachment = {
  id: string;
  kind: "link" | "file";
  name: string;
  mime: string | null;
  size: number | null;
  url: string | null;
  dataUrl: string | null;
  uploadedByUserId: string;
  uploadedByName: string | null;
  createdAt: string;
};

export type TaskDeliverableRequirement = {
  id: string;
  type: TaskDeliverableType;
  label: string | null;
  createdAt: string;
};

export type TaskDeliverableSubmission = {
  id: string;
  requirementId: string;
  employeeId: string;
  employeeName: string | null;
  uploadedByUserId: string;
  uploadedByName: string | null;
  kind: "link" | "file";
  name: string;
  mime: string | null;
  size: number | null;
  url: string | null;
  dataUrl: string | null;
  createdAt: string;
};

export type TaskActivity = {
  id: string;
  kind: string;
  actorUserId: string;
  actorEmployeeId: string | null;
  actorName: string | null;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type TaskDetail = TaskListItem & {
  reviewNote: string | null;
  createdByUserId: string;
  completedAt: string | null;
  completedByUserId: string | null;
  attachments: TaskAttachment[];
  deliverableRequirements: TaskDeliverableRequirement[];
  deliverableSubmissions: TaskDeliverableSubmission[];
  activity: TaskActivity[];
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  submitted: "Submitted",
  changes_requested: "Changes requested",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const DELIVERABLE_TYPE_LABEL: Record<TaskDeliverableType, string> = {
  report: "Report",
  docs: "Docs",
  screenshots: "Screenshots",
  other: "Other",
};
