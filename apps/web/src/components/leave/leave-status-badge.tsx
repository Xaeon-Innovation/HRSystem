import { StatusText } from "@/components/elevora";
import { statusLabel } from "@/lib/leave/format";
import type { LeaveRequestStatus } from "@/lib/leave/types";

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return <StatusText status={statusLabel(status)} />;
}
