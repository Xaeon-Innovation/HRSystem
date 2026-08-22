"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";

export default function MyAnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    const user = getUser();
    if (user?.employeeId) {
      router.replace(`/app/analytics/employees/${user.employeeId}`);
    } else {
      router.replace("/app");
    }
  }, [router]);
  return <p className="text-muted-foreground">Opening your analytics…</p>;
}
