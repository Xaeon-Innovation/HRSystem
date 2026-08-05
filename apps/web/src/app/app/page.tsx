"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Dashboard = {
  clockedIn: number;
  liveLocations: number;
  kpis: number;
  unreadNotifications: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/v1/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading dashboard…</p>;

  const tiles = [
    { label: "Clocked in", value: data.clockedIn },
    { label: "Live on map", value: data.liveLocations },
    { label: "KPIs", value: data.kpis },
    { label: "Unread alerts", value: data.unreadNotifications },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live workforce pulse for your tenant
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
