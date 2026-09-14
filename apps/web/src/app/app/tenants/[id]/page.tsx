"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type TenantDetail = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    settings: {
      brandingName?: string;
      timezone?: string;
      pingIntervalSec?: number;
      locationRetentionDays?: number;
      missedClockOutHours?: number;
    };
  };
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    seatLimit: number | null;
  } | null;
  seatsUsed: number;
  seatLimit: number | null;
  integrationHealth?: {
    connections: number;
    active: number;
    error: number;
    lastSyncAt: string | null;
  };
};

type Audit = {
  id: string;
  action: string;
  actorRole: string | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

export default function TenantDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TenantDetail | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    brandingName: "",
    timezone: "",
    pingIntervalSec: 20,
    locationRetentionDays: 60,
    missedClockOutHours: 12,
  });

  async function load() {
    const detail = await api<TenantDetail>(`/v1/tenants/${params.id}`);
    setData(detail);
    setSettings({
      brandingName: detail.tenant.settings.brandingName ?? detail.tenant.name,
      timezone: detail.tenant.settings.timezone ?? "Africa/Cairo",
      pingIntervalSec: detail.tenant.settings.pingIntervalSec ?? 20,
      locationRetentionDays:
        detail.tenant.settings.locationRetentionDays ?? 60,
      missedClockOutHours: detail.tenant.settings.missedClockOutHours ?? 12,
    });
    const auditData = await api<{ audits: Audit[] }>(
      `/v1/audits?tenantId=${params.id}&limit=20`,
    );
    setAudits(auditData.audits);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.id]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    try {
      await api(`/v1/tenants/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: data?.tenant.name,
          settings: {
            brandingName: settings.brandingName,
            timezone: settings.timezone,
            pingIntervalSec: Number(settings.pingIntervalSec),
            locationRetentionDays: Number(settings.locationRetentionDays),
            missedClockOutHours: Number(settings.missedClockOutHours),
          },
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/tenants" className="text-sm text-muted-foreground hover:underline">
          {t("← Tenants")}</Link>
        <h1 className="text-2xl font-semibold">{data.tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.tenant.slug} · {data.tenant.status}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Plan")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.plan?.name ?? t("None")}{" "}
            <span className="text-muted-foreground">
              ({data.subscription?.status ?? "n/a"})
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Seats")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.seatsUsed}
            {data.seatLimit != null ? ` / ${data.seatLimit}` : t(" / unlimited")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Period end")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.subscription?.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd).toLocaleString()
              : "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Integrations")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.integrationHealth
              ? `${data.integrationHealth.active} active / ${data.integrationHealth.connections} total${
                  data.integrationHealth.error
                    ? ` · ${data.integrationHealth.error} error`
                    : ""
                }`
              : "-"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={saveSettings}>
            {(
              [
                ["brandingName", t("Branding name")],
                ["timezone", t("Timezone")],
                ["pingIntervalSec", t("Ping interval (sec)")],
                ["locationRetentionDays", t("Location retention (days)")],
                ["missedClockOutHours", t("Missed clock-out (hours)")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={String(settings[key])}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      [key]:
                        key === "brandingName" || key === "timezone"
                          ? e.target.value
                          : Number(e.target.value),
                    }))
                  }
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <Button type="submit">{t("Save settings")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-lg font-medium">{t("Recent audits")}</h2>
        <div className="space-y-2">
          {audits.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3 text-sm">
                <p className="font-medium">{a.action}</p>
                <p className="text-xs text-muted-foreground">
                  {a.actorRole ?? "system"} ·{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
          {audits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No audits yet.")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
