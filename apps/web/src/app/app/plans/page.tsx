"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  intervalDays: number;
  seatLimit: number | null;
  paymobPlanId: number | null;
  active: boolean;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    syncPaymob: false,
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
        syncPaymob: false,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Subscription catalog (Paymob sync optional)
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {plans.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {p.name}{" "}
                  <span className="text-xs text-muted-foreground">({p.code})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {(p.amountCents / 100).toFixed(2)} {p.currency} / {p.intervalDays}d
                  · seats {p.seatLimit ?? "∞"}
                  {p.paymobPlanId ? ` · Paymob #${p.paymobPlanId}` : " · not synced"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase">
                  {p.active ? "active" : "inactive"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    api(`/v1/plans/${p.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({ active: !p.active }),
                    }).then(load)
                  }
                >
                  {p.active ? "Deactivate" : "Activate"}
                </Button>
                {!p.paymobPlanId && p.amountCents > 0 ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/plans/${p.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ syncPaymob: true }),
                      })
                        .then(load)
                        .catch((e) => setError(e.message))
                    }
                  >
                    Sync Paymob
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
            {(
              [
                ["code", "Code"],
                ["name", "Name"],
                ["description", "Description"],
                ["amountCents", "Amount (cents)"],
                ["currency", "Currency"],
                ["intervalDays", "Interval days"],
                ["seatLimit", "Seat limit"],
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
                checked={form.syncPaymob}
                onChange={(e) =>
                  setForm((f) => ({ ...f, syncPaymob: e.target.checked }))
                }
              />
              Sync to Paymob on create
            </label>
            <div className="md:col-span-2">
              <Button type="submit">Create plan</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
