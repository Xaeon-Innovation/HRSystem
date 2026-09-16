"use client";

import dynamic from "next/dynamic";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const TasksDashboard = dynamic(
  () =>
    import("@/components/tasks/tasks-dashboard").then((m) => m.TasksDashboard),
  { loading: () => <PageSkeleton dense /> },
);

export default function TasksPage() {
  return <TasksDashboard />;
}
