"use client";

import { LeaveDashboard } from "@/components/leave/leave-dashboard";
import { useUiRedesignGate } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function LeaveCalendarPage() {
  const { redesign } = useUiRedesignGate("/app/leave");

  if (!redesign) {
    return <PageSkeleton dense />;
  }

  return <LeaveDashboard section="calendar" />;
}
