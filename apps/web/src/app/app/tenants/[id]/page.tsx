"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  PLAN_FEATURE_KEYS,
  PLAN_FEATURE_LABELS,
  type PlanFeatureKey,
} from "@hr/shared";
import { api, setSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { Switch } from "@/components/ui/switch";
import {
  AccentCard,
  Chip,
  EmptyState,
  ListRow,
  Notice,
  PageHeader,
  StatusChip,
  Timeline,
} from "@/components/elevora";
import { LogIn, Pause, Play, Trash2 } from "lucide-react";
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
  const [pending, setPending] = useState<
    "suspend" | "activate" | "delete" | null
  >(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [enterBusy, setEnterBusy] = useState(false);


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


  async function confirmTenantAction() {
    if (!pending || !data) return;
    setActionBusy(true);
    setError(null);
    try {
      if (pending === "delete") {
        await api(`/v1/tenants/${params.id}`, { method: "DELETE" });
      } else {
        await api(`/v1/tenants/${params.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            status: pending === "suspend" ? "suspended" : "active",
          }),
        });
      }
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setActionBusy(false);
    }
  }

  async function openWorkspace() {
    setEnterBusy(true);
    setError(null);
    try {
      const res = await api<{
        accessToken: string;
        refreshToken: string;
        user: import("@/lib/api").AuthUser;
      }>("/v1/platform/enter-tenant", {
        method: "POST",
        body: JSON.stringify({
          tenantId: params.id,
          workspaceMode: "unlock_all",
        }),
      });
      setSession(res.accessToken, res.refreshToken, res.user);
      window.location.href = "/app";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setEnterBusy(false);
    }
  }


  if (error && !data) return <Notice tone="warn">{error}</Notice>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Link href="/app/tenants" className="hover:text-ink">
            {t("Tenants")}
          </Link>
        }
        title={data.tenant.name}
        subtitle={`${data.tenant.slug} · ${data.tenant.status}`}
        actions={
          <>
            {data.tenant.status === "active" ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setPending("suspend")}
              >
                <Pause className="h-4 w-4" aria-hidden />
                {t("Suspend")}
              </Button>
            ) : data.tenant.status !== "deleted" ? (
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setPending("activate")}
              >
                <Play className="h-4 w-4" aria-hidden />
                {t("Activate")}
              </Button>
            ) : null}
            {data.tenant.status !== "deleted" ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => setPending("delete")}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {t("Soft-delete")}
              </Button>
            ) : null}
            {data.tenant.status === "active" ||
            data.tenant.status === "suspended" ? (
              <Button
                className="w-full sm:w-auto"
                disabled={enterBusy}
                onClick={() => void openWorkspace()}
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t("Open workspace")}
              </Button>
            ) : null}
          </>
        }
      />
      {error ? <Notice tone="warn">{error}</Notice> : null}

      <div className="grid gap-3.5 lg:grid-cols-12">
        <Card className="min-w-0 overflow-hidden lg:col-span-5">
          <AccentCard className="rounded-none border-0 shadow-none">
            <div className="relative z-[1] flex items-start justify-between gap-2">
              <b className="text-sm">
                {data.plan?.name ?? t("No plan")} {t("plan")}
              </b>
              {data.subscription?.status ? (
                <Chip tone="ink">{data.subscription.status}</Chip>
              ) : (
                <StatusChip
                  status={data.tenant.status}
                  label={data.tenant.status}
                />
              )}
            </div>
            <div className="relative z-[1] mt-4 flex justify-between gap-4">
              <div>
                <div className="text-2xs opacity-75">{t("Seats")}</div>
                <b className="text-stat tabular">{data.seatsUsed}</b>
              </div>
              <div className="text-end">
                <div className="text-2xs opacity-75">{t("Period end")}</div>
                <b className="tabular">
                  {data.subscription?.currentPeriodEnd
                    ? new Date(
                        data.subscription.currentPeriodEnd,
                      ).toLocaleDateString()
                    : "—"}
                </b>
              </div>
            </div>
          </AccentCard>
          {data.subscription ? (
            <CardContent>
              <form className="space-y-3" onSubmit={assignPlan}>
                <div className="space-y-1">
                  <Label>{t("Assign plan")}</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      className="h-10 w-full flex-1 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
                      value={assignPlanId}
                      onChange={(e) => setAssignPlanId(e.target.value)}
                    >
                      {catalogPlans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={assignBusy || !assignPlanId}
                    >
                      {t("Assign")}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>{t("Purchased seats")}</Label>
                  <Input
                    value={assignSeats}
                    onChange={(e) => setAssignSeats(e.target.value)}
                    placeholder={t("Optional")}
                    inputMode="numeric"
                  />
                </div>
              </form>
            </CardContent>
          ) : null}
        </Card>

        <Card className="min-w-0 lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">{t("Modules")}</CardTitle>
            <p className="text-2xs text-ink-muted">
              {t("From plan + overrides")}
              {data.featureFlags?.planCode
                ? ` · ${data.featureFlags.planCode}`
                : ""}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={saveOverrides}>
              <div className="grid gap-2 sm:grid-cols-2">
                {PLAN_FEATURE_KEYS.map((key) => {
                  const effective =
                    data.featureFlags?.effective?.[key] === true;
                  const state = overrides[key];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-[10px] bg-surface-2 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-ink">
                          {t(PLAN_FEATURE_LABELS[key])}
                        </p>
                        <p className="text-2xs text-ink-muted">
                          {state === "inherit"
                            ? t("Inherit")
                            : state === "on"
                              ? t("On")
                              : t("Off")}
                        </p>
                      </div>
                      <Switch
                        aria-label={t(PLAN_FEATURE_LABELS[key])}
                        checked={
                          state === "inherit" ? effective : state === "on"
                        }
                        onCheckedChange={(on) =>
                          setOverrides((prev) => ({
                            ...prev,
                            [key]: on ? "on" : "off",
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
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

        <Card className="min-w-0 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("Linked leads")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(data.leads ?? []).length === 0 ? (
              <EmptyState className="py-6" title={t("No linked leads.")} />
            ) : (
              (data.leads ?? []).map((lead) => (
                <ListRow
                  key={lead.id}
                  title={lead.name}
                  subtitle={`${lead.source} · ${new Date(lead.createdAt).toLocaleDateString()}`}
                  status={lead.status}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("Recent payments")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {(data.recentPaymentEvents ?? []).length === 0 ? (
              <EmptyState className="py-6" title={t("No payment events.")} />
            ) : (
              (data.recentPaymentEvents ?? []).map((ev) => (
                <ListRow
                  key={ev.id}
                  title={ev.triggerType}
                  subtitle={ev.provider}
                  value={new Date(ev.processedAt).toLocaleDateString()}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">{t("Recent audits")}</CardTitle>
          </CardHeader>
          <CardContent>
            {audits.length === 0 ? (
              <EmptyState className="py-6" title={t("No audits yet.")} />
            ) : (
              <Timeline
                items={audits.slice(0, 8).map((a) => ({
                  id: a.id,
                  title: a.action,
                  meta: `${a.actorRole ?? "system"} · ${new Date(a.createdAt).toLocaleDateString()}`,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-12">
          <CardHeader>
            <CardTitle className="text-base">{t("Settings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveSettings}>
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
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full sm:w-auto">
                  {t("Save settings")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending === "delete"
            ? `Soft-delete “${data.tenant.name}”?`
            : pending === "suspend"
              ? `Suspend “${data.tenant.name}”?`
              : pending
                ? `Activate “${data.tenant.name}”?`
                : ""
        }
        description={
          pending === "delete"
            ? "This marks the tenant deleted. Logins will be blocked."
            : pending === "suspend"
              ? "Users in this tenant will not be able to sign in until reactivated."
              : "This restores login access. It does not create a Polar subscription."
        }
        confirmLabel={
          pending === "delete"
            ? "Soft delete"
            : pending === "suspend"
              ? "Suspend"
              : "Activate"
        }
        variant={pending === "activate" ? "default" : "destructive"}
        busy={actionBusy}
        onConfirm={confirmTenantAction}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setPending(null);
        }}
      />
    </div>
  );
}
