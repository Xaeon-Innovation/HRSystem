"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const HiringDashboard = dynamic(
  () =>
    import("@/components/hiring/hiring-dashboard").then(
      (m) => m.HiringDashboard,
    ),
  { loading: () => <PageSkeleton dense /> },
);

export default function HiringPage() {
  return <HiringDashboard />;
}
