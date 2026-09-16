"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  MODULE_KEYS,
  MODULE_LAUNCH_STATUSES,
  type ModuleKey,
  type ModuleLaunchStatus,
  type PlanFeatureKey,
} from "@hr/shared";
import { api } from "@/lib/api";
import {
  enterLabUnlockAll,
  enterPlanPreview,
} from "@/components/workspace-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type FeaturesMatrix = {
  keys: Array<{
    key: PlanFeatureKey;
    label: string;
    pack: string;
    packLabel: string;
    launchStatus: ModuleLaunchStatus;
  }>;
  modules: Array<{
    key: ModuleKey;
    label: string;
    pack: string;
    href: string;
    launchStatus: ModuleLaunchStatus;
  }>;
  plans: Array<{
    id: string;
    code: string;
    name: string;
    active: boolean;
    amountCents: number;
    features: Partial<Record<PlanFeatureKey, boolean>>;
  }>;
  overrideCounts: Record<PlanFeatureKey, { on: number; off: number }>;
  tenantsWithOverrides: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    overrides: Partial<Record<PlanFeatureKey, boolean>>;
  }>;
  labTenant: { id: string; name: string; slug: string } | null;
};

export default function FeaturesPage() {
  const [data, setData] = useState<FeaturesMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function load() {
    const next = await api<FeaturesMatrix>("/v1/platform/features");
    setData(next);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  async function togglePlanFeature(
    planId: string,
    key: PlanFeatureKey,
    next: boolean,
  ) {
    setBusyKey(`${planId}:${key}`);
    setError(null);
    try {
      await api(`/v1/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({ features: { [key]: next } }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function setLaunch(key: ModuleKey, launchStatus: ModuleLaunchStatus) {
    setBusyKey(`launch:${key}`);
    setError(null);
    try {
      await api(`/v1/platform/modules/${key}/launch`, {
        method: "PATCH",
        body: JSON.stringify({ launchStatus }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyKey(null);
    }
  }

  if (error && !data) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  const matrixPlans = data.plans.filter(
    (p) => p.active || MODULE_KEYS.some((k) => p.features?.[k] === true),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("Features")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Module catalog, plan matrix, launch status, and tenant overrides.",
            )}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() =>
              void enterLabUnlockAll().catch((e) =>
                setError(e instanceof Error ? e.message : "Failed"),
              )
            }
          >
            {t("Open Lab")}
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Module launch")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data.modules ?? data.keys).map((mod) => {
            const key = mod.key as ModuleKey;
            const status =
              "launchStatus" in mod
                ? mod.launchStatus
                : data.keys.find((k) => k.key === key)?.launchStatus ?? "ga";
            const busy = busyKey === `launch:${key}`;
            return (
              <div
                key={key}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t(mod.label)}</p>
                  <p className="text-xs text-muted-foreground">{key}</p>
                </div>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-40"
                  disabled={busy}
                  value={status}
                  onChange={(e) =>
                    void setLaunch(key, e.target.value as ModuleLaunchStatus)
                  }
                >
                  {MODULE_LAUNCH_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Plan matrix")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {matrixPlans.map((plan) => (
              <Button
                key={`preview-${plan.id}`}
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() =>
                  void enterPlanPreview(plan.id).catch((e) =>
                    setError(e instanceof Error ? e.message : "Failed"),
                  )
                }
              >
                {t("Preview")} {plan.name}
              </Button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3 font-medium">{t("Module")}</th>
                  {matrixPlans.map((plan) => (
                    <th key={plan.id} className="px-2 py-2 font-medium">
                      <span className="block">{plan.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {plan.code}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.keys.map(({ key, label, packLabel }) => (
                  <tr key={key} className="border-b last:border-0">
                    <td className="py-3 pr-3 align-middle">
                      <p className="font-medium">{t(label)}</p>
                      <p className="text-xs text-muted-foreground">
                        {packLabel} · {t("Overrides")}: +
                        {data.overrideCounts[key]?.on ?? 0} / −
                        {data.overrideCounts[key]?.off ?? 0}
                      </p>
                    </td>
                    {matrixPlans.map((plan) => {
                      const on = plan.features?.[key] === true;
                      const cellBusy = busyKey === `${plan.id}:${key}`;
                      return (
                        <td key={plan.id} className="px-2 py-3 align-middle">
                          <Button
                            size="sm"
                            variant={on ? "default" : "outline"}
                            className="w-full min-w-[4.5rem]"
                            disabled={cellBusy}
                            onClick={() =>
                              void togglePlanFeature(plan.id, key, !on)
                            }
                          >
                            {on ? t("On") : t("Off")}
                          </Button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Tenants with overrides")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.tenantsWithOverrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No tenant feature overrides.")}
            </p>
          ) : (
            data.tenantsWithOverrides.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/tenants/${row.id}`}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {row.slug} · {row.status}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {MODULE_KEYS.filter(
                      (k) =>
                        row.overrides[k] === true || row.overrides[k] === false,
                    ).map((k) => (
                      <span
                        key={k}
                        className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {k}: {row.overrides[k] ? t("On") : t("Off")}
                      </span>
                    ))}
                  </div>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Link href={`/app/tenants/${row.id}`}>{t("Edit")}</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
