"use client";

import { FormEvent, useEffect, useState } from "react";
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
import { t } from "@/i18n";

type PlanFeatures = Partial<
  Record<PlanFeatureKey, boolean> & {
    pingIntervalSec?: number;
    locationRetentionDays?: number;
    trialDays?: number;
  }
>;

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  intervalDays: number;
  seatLimit: number | null;
  polarProductId: string | null;
  active: boolean;
  features: PlanFeatures;
};

type FeatureEdit = Record<PlanFeatureKey, boolean> & {
  pingIntervalSec: string;
  locationRetentionDays: string;
  trialDays: string;
};

function emptyFeatures(defaults?: PlanFeatures): FeatureEdit {
  return {
    liveMap: defaults?.liveMap === true,
    teamToday: defaults?.teamToday === true,
    leave: defaults?.leave === true,
    hiring: defaults?.hiring === true,
    kpis: defaults?.kpis === true,
    compensation: defaults?.compensation === true,
    tasks: defaults?.tasks === true,
    analytics: defaults?.analytics === true,
    integrations: defaults?.integrations === true,
    pingIntervalSec:
      defaults?.pingIntervalSec != null ? String(defaults.pingIntervalSec) : "",
    locationRetentionDays:
      defaults?.locationRetentionDays != null
        ? String(defaults.locationRetentionDays)
        : "",
    trialDays: defaults?.trialDays != null ? String(defaults.trialDays) : "",
  };
}

function featuresPayload(f: FeatureEdit) {
  return {
    liveMap: f.liveMap,
    teamToday: f.teamToday,
    leave: f.leave,
    hiring: f.hiring,
    kpis: f.kpis,
    compensation: f.compensation,
    tasks: f.tasks,
    analytics: f.analytics,
    integrations: f.integrations,
    ...(f.pingIntervalSec !== ""
      ? { pingIntervalSec: Number(f.pingIntervalSec) }
      : {}),
    ...(f.locationRetentionDays !== ""
      ? { locationRetentionDays: Number(f.locationRetentionDays) }
      : {}),
    ...(f.trialDays !== "" ? { trialDays: Number(f.trialDays) } : {}),
  };
}

function FeatureToggles({
  value,
  onChange,
}: {
  value: FeatureEdit;
  onChange: (next: FeatureEdit) => void;
}) {
  return (
    <div className="space-y-3 sm:col-span-3">
      <p className="text-sm font-medium">{t("Modules")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {PLAN_FEATURE_KEYS.map((key) => (
          <label
            key={key}
            className="flex min-h-10 items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: e.target.checked })
              }
            />
            {t(PLAN_FEATURE_LABELS[key])}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["pingIntervalSec", t("Ping interval (sec)")],
            ["locationRetentionDays", t("Location retention (days)")],
            ["trialDays", t("Trial days")],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label>{label}</Label>
            <Input
              type="number"
              value={value[key]}
              onChange={(e) =>
                onChange({ ...value, [key]: e.target.value })
              }
              placeholder="—"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    amountCents: 0,
    seatLimit: "" as string,
    features: emptyFeatures(),
  });
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    syncPolar: false,
    features: emptyFeatures(),
  });

  async function load() {
    const data = await api<{ plans: Plan[] }>("/v1/plans");
    setPlans(data.plans);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/plans", {
        method: "POST",
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description || null,
          amountCents: form.amountCents,
          currency: form.currency,
          intervalDays: form.intervalDays,
          seatLimit: form.seatLimit || null,
          syncPolar: form.syncPolar,
          features: featuresPayload(form.features),
        }),
      });
      setForm({
        code: "",
        name: "",
        description: "",
        amountCents: 4900,
        currency: "USD",
        intervalDays: 30,
        seatLimit: 25,
        syncPolar: false,
        features: emptyFeatures(),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function syncAllPolar(updateExisting: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api("/v1/plans/sync-polar", {
        method: "POST",
        body: JSON.stringify({ updateExisting }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Polar sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(plan: Plan, syncPolar: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api(`/v1/plans/${plan.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: edit.name,
          amountCents: edit.amountCents,
          seatLimit: edit.seatLimit === "" ? null : Number(edit.seatLimit),
          features: featuresPayload(edit.features),
          syncPolar,
        }),
      });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("Plans")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Subscription catalog (Polar sync optional)")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void syncAllPolar(false)}
          >
            {t("Sync all to Polar")}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void syncAllPolar(true)}
          >
            {t("Sync all (update prices)")}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {t(
          "Price updates affect new Polar checkouts. Existing subscribers keep their grandfathered Polar price.",
        )}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-3 py-3">
              {editingId === p.id ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label>{t("Name")}</Label>
                    <Input
                      value={edit.name}
                      onChange={(e) =>
                        setEdit((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("Amount (cents)")}</Label>
                    <Input
                      type="number"
                      value={edit.amountCents}
                      onChange={(e) =>
                        setEdit((f) => ({
                          ...f,
                          amountCents: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("Seat limit")}</Label>
                    <Input
                      value={edit.seatLimit}
                      onChange={(e) =>
                        setEdit((f) => ({ ...f, seatLimit: e.target.value }))
                      }
                      placeholder="∞"
                    />
                  </div>
                  <FeatureToggles
                    value={edit.features}
                    onChange={(features) =>
                      setEdit((f) => ({ ...f, features }))
                    }
                  />
                  <div className="flex flex-col gap-2 sm:col-span-3 sm:flex-row">
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => void saveEdit(p, false)}
                    >
                      {t("Save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={busy || p.amountCents <= 0}
                      onClick={() => void saveEdit(p, true)}
                    >
                      {t("Save + sync Polar")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => setEditingId(null)}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {p.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({p.code})
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(p.amountCents / 100).toFixed(2)} {p.currency} /{" "}
                      {p.intervalDays}
                      {t("d · seats")}
                      {p.seatLimit ?? "∞"}
                      {p.polarProductId
                        ? ` · Polar ${p.polarProductId.slice(0, 8)}…`
                        : t(" · not synced")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PLAN_FEATURE_KEYS.map((key) => (
                        <span
                          key={key}
                          className={`rounded-md px-2 py-0.5 text-[11px] ${
                            p.features?.[key] === true
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {PLAN_FEATURE_LABELS[key]}
                          {p.features?.[key] === true ? "" : " off"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-xs uppercase">
                      {p.active ? "active" : "inactive"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setEditingId(p.id);
                        setEdit({
                          name: p.name,
                          amountCents: p.amountCents,
                          seatLimit:
                            p.seatLimit == null ? "" : String(p.seatLimit),
                          features: emptyFeatures(p.features),
                        });
                      }}
                    >
                      {t("Edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        api(`/v1/plans/${p.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ active: !p.active }),
                        }).then(load)
                      }
                    >
                      {p.active ? t("Deactivate") : t("Activate")}
                    </Button>
                    {p.amountCents > 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          api(`/v1/plans/${p.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ syncPolar: true }),
                          })
                            .then(load)
                            .catch((e) => setError(e.message))
                        }
                      >
                        {p.polarProductId
                          ? t("Update Polar")
                          : t("Sync Polar")}
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Create plan")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
            {(
              [
                ["code", t("Code")],
                ["name", t("Name")],
                ["description", t("Description")],
                ["amountCents", t("Amount (cents)")],
                ["currency", t("Currency")],
                ["intervalDays", t("Interval days")],
                ["seatLimit", t("Seat limit")],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label>{label}</Label>
                <Input
                  value={String(form[key])}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [key]:
                        key === "code" ||
                        key === "name" ||
                        key === "description" ||
                        key === "currency"
                          ? e.target.value
                          : Number(e.target.value),
                    }))
                  }
                  required={key !== "description"}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <FeatureToggles
                value={form.features}
                onChange={(features) =>
                  setForm((f) => ({ ...f, features }))
                }
              />
            </div>
            <label className="flex min-h-10 items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.syncPolar}
                onChange={(e) =>
                  setForm((f) => ({ ...f, syncPolar: e.target.checked }))
                }
              />
              {t("Sync to Polar on create")}
            </label>
            <div className="md:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">
                {t("Create plan")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
