"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type PlanFeatures = Record<string, boolean | number | string>;

type BillingCurrent = {
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    amountCents: number;
    currency: string;
    seatLimit: number | null;
    features?: PlanFeatures;
  } | null;
  seatsUsed: number;
  seatLimit: number | null;
  accessAllowed: boolean;
  paymobConfigured: boolean;
  availablePlans: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    amountCents: number;
    currency: string;
    seatLimit: number | null;
    paymobPlanId: number | null;
    features?: PlanFeatures;
  }>;
};

function packSummary(features?: PlanFeatures): string {
  if (!features) return "";
  const packs: string[] = [];
  if (features.fieldOps === true) packs.push(t("Field ops"));
  if (features.peopleOps === true) packs.push(t("People ops"));
  if (features.analytics === true) packs.push(t("Analytics"));
  if (features.integrations === true) packs.push(t("Integrations"));
  return packs.join(" · ");
}

export default function BillingPage() {
  const [data, setData] = useState<BillingCurrent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const current = await api<BillingCurrent>("/v1/billing/current");
    setData(current);
  }

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("checkout") === "done"
    ) {
      setMessage(
        "Checkout completed. Status will update after Paymob confirms.",
      );
    }
    load().catch((e) => setError(e.message));
  }, []);

  async function checkout(planId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ checkoutUrl: string }>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await api("/v1/billing/cancel", { method: "POST", body: "{}" });
      setMessage("Subscription will cancel at period end.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  const currentPacks = packSummary(data.plan?.features);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Billing")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Manage your organization subscription")}
        </p>
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Current plan")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              {data.plan?.name ?? t("None")}{" "}
              <span className="text-muted-foreground">
                ({data.subscription?.status ?? "n/a"})
              </span>
            </p>
            {currentPacks ? (
              <p className="mt-1 text-xs text-muted-foreground">{currentPacks}</p>
            ) : null}
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
            <CardTitle className="text-base">{t("Renews / ends")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.subscription?.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString()
              : "-"}
          </CardContent>
        </Card>
      </div>

      {data.subscription && !data.subscription.cancelAtPeriodEnd ? (
        <Button variant="outline" disabled={busy} onClick={cancel}>
          {t("Cancel at period end")}
        </Button>
      ) : null}

      {!data.paymobConfigured ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Online checkout is not configured yet. Contact platform support to upgrade.",
          )}
        </p>
      ) : null}

      <div>
        <h2 className="mb-2 text-lg font-medium">{t("Available plans")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {t(
            "Field and People packs can be bought alone. Ops and Scale bundle both with larger seat bands.",
          )}
        </p>
        <div className="space-y-2">
          {data.availablePlans.map((p) => {
            const packs = packSummary(p.features);
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(p.amountCents / 100).toFixed(2)} {p.currency}
                      {t("/mo · seats")} {p.seatLimit ?? "∞"}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                    {packs ? (
                      <p className="mt-1 text-xs text-muted-foreground">{packs}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={
                      busy ||
                      !data.paymobConfigured ||
                      !p.paymobPlanId ||
                      data.plan?.id === p.id
                    }
                    onClick={() => checkout(p.id)}
                  >
                    {data.plan?.id === p.id ? t("Current") : t("Subscribe")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("Need more than 150 seats?")}{" "}
          <a href="/demo" className="text-primary underline-offset-2 hover:underline">
            {t("Request an Enterprise demo")}
          </a>
        </p>
      </div>
    </div>
  );
}
