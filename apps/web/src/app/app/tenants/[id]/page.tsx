"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PLAN_FEATURE_KEYS,
  PLAN_FEATURE_LABELS,
  type PlanFeatureKey,
} from "@hr/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type OverrideState = "inherit" | "on" | "off";

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
      featureOverrides?: Partial<Record<PlanFeatureKey, boolean>>;
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
  featureFlags?: {
    planFeatures: Partial<Record<PlanFeatureKey, boolean>>;
    overrides: Partial<Record<PlanFeatureKey, boolean>>;
    effective: Partial<Record<PlanFeatureKey, boolean>>;
    planCode: string | null;
  };
  integrationHealth?: {
    connections: number;
    active: number;
    error: number;
    lastSyncAt: string | null;
  };
  recentPaymentEvents?: Array<{
    id: string;
    triggerType: string;
    provider: string;
    processedAt: string;
  }>;
  leads?: Array<{
    id: string;
    source: string;
    status: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
};

function overridesFromDetail(
  detail: TenantDetail,
): Record<PlanFeatureKey, OverrideState> {
  const raw =
    detail.featureFlags?.overrides ??
    detail.tenant.settings.featureOverrides ??
    {};
  return Object.fromEntries(
    PLAN_FEATURE_KEYS.map((key) => {
      if (raw[key] === true) return [key, "on"];
      if (raw[key] === false) return [key, "off"];
      return [key, "inherit"];
    }),
  ) as Record<PlanFeatureKey, OverrideState>;
}

function overridesPayload(
  states: Record<PlanFeatureKey, OverrideState>,
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const key of PLAN_FEATURE_KEYS) {
    if (states[key] === "on") out[key] = true;
    if (states[key] === "off") out[key] = false;
  }
  return out;
}

const inheritOverrides = Object.fromEntries(
  PLAN_FEATURE_KEYS.map((k) => [k, "inherit"]),
) as Record<PlanFeatureKey, OverrideState>;

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
  const [overrides, setOverrides] =
    useState<Record<PlanFeatureKey, OverrideState>>(inheritOverrides);
  const [overrideBusy, setOverrideBusy] = useState(false);
  const [catalogPlans, setCatalogPlans] = useState<
    Array<{ id: string; code: string; name: string; active: boolean }>
  >([]);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignSeats, setAssignSeats] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

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
    setOverrides(overridesFromDetail(detail));
    setAssignPlanId(detail.plan?.id ?? "");
    setAssignSeats(
      detail.seatLimit != null ? String(detail.seatLimit) : "",
    );
    const auditData = await api<{ audits: Audit[] }>(
      `/v1/audits?tenantId=${params.id}&limit=20`,
    );
    setAudits(auditData.audits);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    void api<{
      plans: Array<{ id: string; code: string; name: string; active: boolean }>;
    }>("/v1/plans")
      .then((d) => setCatalogPlans(d.plans.filter((p) => p.active)))
      .catch(() => undefined);
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

  async function saveOverrides(e: FormEvent) {
    e.preventDefault();
    setOverrideBusy(true);
    setError(null);
    try {
      await api(`/v1/tenants/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            featureOverrides: overridesPayload(overrides),
          },
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setOverrideBusy(false);
    }
  }

  async function assignPlan(e: FormEvent) {
    e.preventDefault();
    if (!data?.subscription?.id || !assignPlanId) return;
    setAssignBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        planId: assignPlanId,
        status: "active",
      };
      const seats = assignSeats.trim()
        ? Number(assignSeats)
        : null;
      if (seats != null && Number.isFinite(seats) && seats > 0) {
        body.purchasedSeats = seats;
      }
      await api(`/v1/subscriptions/${data.subscription.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAssignBusy(false);
    }
  }

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/tenants"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t("← Tenants")}
        </Link>
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

      {data.subscription ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Assign plan (Enterprise / custom)")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              onSubmit={assignPlan}
            >
              <div className="w-full space-y-1 sm:w-56">
                <Label>{t("Plan")}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                >
                  {catalogPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full space-y-1 sm:w-36">
                <Label>{t("Purchased seats")}</Label>
                <Input
                  value={assignSeats}
                  onChange={(e) => setAssignSeats(e.target.value)}
                  placeholder={t("Optional")}
                  inputMode="numeric"
                />
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={assignBusy || !assignPlanId}
              >
                {t("Assign & activate")}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              {t(
                "Sales path: assign Enterprise (or any plan), set seats, then customize modules below. No Polar checkout required for $0 plans.",
              )}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Feature overrides")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t(
              "Inherit uses the plan. On grants without the plan; Off hides despite the plan.",
            )}
            {data.featureFlags?.planCode
              ? ` ${t("Plan")}: ${data.featureFlags.planCode}.`
              : ""}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLAN_FEATURE_KEYS.map((key) => {
              const on = data.featureFlags?.effective?.[key] === true;
              return (
                <span
                  key={key}
                  className={`rounded-md px-2 py-0.5 text-[11px] ${
                    on
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {PLAN_FEATURE_LABELS[key]}: {on ? t("On") : t("Off")}
                </span>
              );
            })}
          </div>
          <form className="space-y-3" onSubmit={saveOverrides}>
            {PLAN_FEATURE_KEYS.map((key) => (
              <div
                key={key}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {t(PLAN_FEATURE_LABELS[key])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Plan")}:{" "}
                    {data.featureFlags?.planFeatures?.[key] === true
                      ? t("On")
                      : t("Off")}
                  </p>
                </div>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-40"
                  value={overrides[key]}
                  onChange={(e) =>
                    setOverrides((prev) => ({
                      ...prev,
                      [key]: e.target.value as OverrideState,
                    }))
                  }
                >
                  <option value="inherit">{t("Inherit")}</option>
                  <option value="on">{t("On")}</option>
                  <option value="off">{t("Off")}</option>
                </select>
              </div>
            ))}
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={overrideBusy}
            >
              {t("Save overrides")}
            </Button>
          </form>
        </CardContent>
      </Card>

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
              <Button type="submit" className="w-full sm:w-auto">
                {t("Save settings")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-medium">{t("Linked leads")}</h2>
          <div className="space-y-2">
            {(data.leads ?? []).map((lead) => (
              <Card key={lead.id}>
                <CardContent className="py-3 text-sm">
                  <p className="font-medium">
                    {lead.name} · {lead.source}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.email} · {lead.status} ·{" "}
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
            {(data.leads ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No linked leads.")}
              </p>
            ) : null}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-lg font-medium">{t("Recent payments")}</h2>
          <div className="space-y-2">
            {(data.recentPaymentEvents ?? []).map((ev) => (
              <Card key={ev.id}>
                <CardContent className="py-3 text-sm">
                  <p className="font-medium">{ev.triggerType}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.provider} ·{" "}
                    {new Date(ev.processedAt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
            {(data.recentPaymentEvents ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No payment events.")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

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
