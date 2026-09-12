"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { t } from "@/i18n";

type Alert = {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  alertDate: string;
};

export default function AnalyticsAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await api<{ alerts: Alert[] }>("/v1/analytics/alerts");
    setAlerts(data.alerts);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function setStatus(id: string, status: "acknowledged" | "resolved") {
    try {
      await api(`/v1/analytics/alerts/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/analytics" className="text-sm text-muted-foreground hover:underline">
          {t("← Analytics")}</Link>
        <h1 className="text-2xl font-semibold">{t("Analytics alerts")}</h1>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {alerts.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {a.title}{" "}
                  <span className="text-xs uppercase text-muted-foreground">
                    {a.severity} · {a.status}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {a.alertType} · {a.alertDate}
                  {a.description ? ` · ${a.description}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "acknowledged")}>
                  {t("Ack")}</Button>
                <Button size="sm" onClick={() => setStatus(a.id, "resolved")}>
                  {t("Resolve")}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No alerts.")}</p>
        ) : null}
      </div>
    </div>
  );
}
