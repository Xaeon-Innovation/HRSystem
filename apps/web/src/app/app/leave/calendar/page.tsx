"use client";

import dynamic from "next/dynamic";
import { useUiRedesignGate } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const LeaveDashboard = dynamic(
  () =>
    import("@/components/leave/leave-dashboard").then((m) => m.LeaveDashboard),
  { loading: () => <PageSkeleton dense /> },
);

export default function LeaveCalendarPage() {
  const { redesign } = useUiRedesignGate("/app/leave");

  if (!redesign) {
    return <PageSkeleton dense />;
  }

  return <LeaveDashboard section="calendar" />;
}
