"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  StatusChip,
} from "@/components/elevora";
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
      <PageHeader
        title={t("Analytics alerts")}
        breadcrumbs={
          <Link href="/app/analytics" className="hover:underline">
            {t("← Analytics")}
          </Link>
        }
      />
      {error ? <Notice tone="warn">{error}</Notice> : null}
      {alerts.length === 0 && !error ? (
        <Card className="overflow-hidden border-line bg-surface p-0">
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title={t("No alerts.")}
            subtitle={t("Operational alerts from analytics will appear here.")}
          />
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-sm border border-line bg-surface">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line bg-surface-2 text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">{t("Alert")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Severity")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                <th className="px-3 py-2.5 font-medium">{t("Date")}</th>
                <th className="px-4 py-2.5 font-medium">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line last:border-0 align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{a.title}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {a.alertType}
                      {a.description ? ` · ${a.description}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <Chip
                      tone={
                        /critical|high/i.test(a.severity)
                          ? "danger"
                          : /medium|warn/i.test(a.severity)
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {a.severity}
                    </Chip>
                  </td>
                  <td className="px-3 py-3">
                    <StatusChip status={a.status} />
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{a.alertDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setStatus(a.id, "acknowledged")}
                      >
                        {t("Acknowledge")}
                      </Button>
                      <Button
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setStatus(a.id, "resolved")}
                      >
                        {t("Resolve")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
