"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const KpiDashboard = dynamic(
  () =>
    import("@/components/kpis/kpi-dashboard").then((m) => m.KpiDashboard),
  { loading: () => <PageSkeleton dense /> },
);

export default function KpisPage() {
  return <KpiDashboard />;
}
