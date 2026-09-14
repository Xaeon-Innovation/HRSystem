"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const LeaveDashboard = dynamic(
  () =>
    import("@/components/leave/leave-dashboard").then((m) => m.LeaveDashboard),
  { loading: () => <PageSkeleton dense /> },
);

export default function LeavePage() {
  return <LeaveDashboard section="requests" />;
}
