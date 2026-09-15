"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/i18n";

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
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    syncPolar: false,
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
          ...form,
          description: form.description || null,
          seatLimit: form.seatLimit || null,
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
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function syncAllPolar() {
    setBusy(true);
    setError(null);
    try {
      await api("/v1/plans/sync-polar", { method: "POST", body: "{}" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Polar sync failed");
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
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => void syncAllPolar()}
        >
          {t("Sync all to Polar")}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs uppercase">
                  {p.active ? "active" : "inactive"}
                </span>
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
                {!p.polarProductId && p.amountCents > 0 ? (
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
                    {t("Sync Polar")}
                  </Button>
                ) : null}
              </div>
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
            <label className="flex items-center gap-2 text-sm md:col-span-2">
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
