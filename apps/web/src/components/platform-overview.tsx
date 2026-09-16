"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type Overview = {
  tenantsByStatus: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  mrrCents: number;
  mrrCurrency: string;
  funnel: {
    newLeads: number;
    demosLast7Days: number;
    demosLast30Days: number;
    activePaidTenants: number;
    openTrials: number;
  };
  recentLeads: Array<{
    id: string;
    name: string;
    company: string;
    source: string;
    status: string;
    createdAt: string;
  }>;
  recentPaymentEvents: Array<{
    id: string;
    triggerType: string;
    provider: string;
    processedAt: string;
    tenant: { id: string; name: string | null; slug: string | null } | null;
  }>;
};

export function PlatformOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Overview>("/v1/platform/overview")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  const mrr = (data.mrrCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: data.mrrCurrency || "USD",
  });

  const tiles = [
    { label: t("MRR (est.)"), value: mrr },
    {
      label: t("Active tenants"),
      value: String(data.tenantsByStatus.active ?? 0),
    },
    {
      label: t("Paid subs"),
      value: String(data.subscriptionsByStatus.active ?? 0),
    },
    { label: t("Open trials"), value: String(data.funnel.openTrials) },
    { label: t("New leads"), value: String(data.funnel.newLeads) },
    {
      label: t("Demos (7d)"),
      value: String(data.funnel.demosLast7Days),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Platform overview")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Fleet health, revenue estimate, and inbound pipeline")}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("Open a workspace to test all product pages.")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Card key={tile.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {tile.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums sm:text-3xl">
                {tile.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("Recent leads")}</CardTitle>
            <Link
              href="/app/leads"
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("View all")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No leads yet.")}</p>
            ) : (
              data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {lead.company}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.name} · {lead.source}
                    </p>
                  </div>
                  <span className="text-xs uppercase text-muted-foreground">
                    {lead.status}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t("Recent payments")}</CardTitle>
            <Link
              href="/app/payments"
              className="text-sm text-muted-foreground hover:underline"
            >
              {t("View all")}
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recentPaymentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("No payment events yet.")}
              </p>
            ) : (
              data.recentPaymentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-col gap-0.5 border-b border-border/60 py-2 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ev.triggerType}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ev.tenant?.name ?? t("Unlinked")} · {ev.provider}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(ev.processedAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href="/app/tenants"
          className="text-sm text-primary hover:underline"
        >
          {t("Manage tenants")}
        </Link>
        <Link
          href="/app/subscriptions"
          className="text-sm text-primary hover:underline"
        >
          {t("Manage subscriptions")}
        </Link>
        <Link href="/app/plans" className="text-sm text-primary hover:underline">
          {t("Edit plans")}
        </Link>
        <Link
          href="/app/features"
          className="text-sm text-primary hover:underline"
        >
          {t("Features")}
        </Link>
      </div>
    </div>
  );
}
