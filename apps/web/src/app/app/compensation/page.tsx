"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const CompensationDashboard = dynamic(
  () =>
    import("@/components/compensation/compensation-dashboard").then(
      (m) => m.CompensationDashboard,
    ),
  { loading: () => <PageSkeleton dense /> },
);

export default function CompensationPage() {
  return <CompensationDashboard />;
}
