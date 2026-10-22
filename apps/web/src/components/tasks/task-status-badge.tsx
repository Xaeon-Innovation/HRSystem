import { Chip, StatusChip } from "@/components/elevora";
import type { Tone } from "@/lib/status-tone";
import { t } from "@/i18n";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/components/tasks/types";

const PRIORITY_TONE: Record<TaskPriority, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warn",
  urgent: "danger",
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  const label = t(TASK_STATUS_LABEL[status]);
  return <StatusChip status={label} label={label} className={className} />;
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <Chip tone={PRIORITY_TONE[priority]} className={className}>
      {t(TASK_PRIORITY_LABEL[priority])}
    </Chip>
  );
}
