"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Inbox, Receipt } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";
import {
  EmptyState,
  ListRow,
  PageHeader,
  SegmentBar,
  StatBlock,
} from "@/components/elevora";

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

  const activeTenants = data.tenantsByStatus.active ?? 0;
  const trialTenants = data.tenantsByStatus.trialing ?? data.funnel.openTrials;
  const statusSegs = Object.entries(data.tenantsByStatus).map(
    ([, n], i) => ({
      value: n,
      tone: (["accent", "warn", "yellow", "idle", "soft"] as const)[i % 5],
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Platform overview")}
        subtitle={t(
          "Fleet health, revenue estimate, and inbound pipeline.",
        )}
        actions={
          <>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/tenants">{t("Tenants")}</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/app/features">{t("Enter lab")}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3.5">
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div>
                <div className="text-stat-lg font-semibold tabular tracking-tight text-ink">
                  {mrr}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {t("MRR (est.)")} · {t("paid subscriptions")}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatBlock
                    label={t("Active tenants")}
                    value={activeTenants}
                    size="sm"
                  />
                  <StatBlock
                    label={t("Open trials")}
                    value={data.funnel.openTrials}
                    size="sm"
                  />
                  <StatBlock
                    label={t("Paid subs")}
                    value={data.subscriptionsByStatus.active ?? 0}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex flex-row gap-4 overflow-x-auto border-t border-line pt-4 lg:flex-col lg:gap-0 lg:border-s lg:border-t-0 lg:ps-5 lg:pt-0">
                <div className="min-w-[100px] shrink-0 py-2 lg:border-b lg:border-line lg:py-4">
                  <div className="text-2xs text-ink-muted">{t("New leads")}</div>
                  <div className="mt-1 text-stat font-semibold tabular text-ink">
                    {data.funnel.newLeads}
                  </div>
                </div>
                <div className="min-w-[100px] shrink-0 py-2 lg:border-b lg:border-line lg:py-4">
                  <div className="text-2xs text-ink-muted">{t("Demos (7d)")}</div>
                  <div className="mt-1 text-stat font-semibold tabular text-ink">
                    {data.funnel.demosLast7Days}
                  </div>
                </div>
                <div className="min-w-[100px] shrink-0 py-2 lg:py-4">
                  <div className="text-2xs text-ink-muted">{t("Demos (30d)")}</div>
                  <div className="mt-1 text-stat font-semibold tabular text-ink">
                    {data.funnel.demosLast30Days}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <section className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink">
                {t("Tenant status")}
              </h3>
              <p className="mt-0.5 text-2xs text-ink-muted">
                {activeTenants} {t("active")} · {trialTenants} {t("trial")}
              </p>
              {statusSegs.length > 0 ? (
                <SegmentBar className="mt-4" segments={statusSegs} />
              ) : (
                <EmptyState className="py-6" title={t("No tenants yet")} />
              )}
              <ul className="mt-3 space-y-1.5 text-xs">
                {Object.entries(data.tenantsByStatus).map(([status, n]) => (
                  <li
                    key={status}
                    className="flex justify-between gap-2 text-ink-2"
                  >
                    <span className="capitalize">{status}</span>
                    <b className="tabular text-ink">{n}</b>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink">
                {t("Lead funnel")}
              </h3>
              <p className="mt-0.5 text-2xs text-ink-muted">
                {t("Inbound → demo → paid")}
              </p>
              <SegmentBar
                className="mt-4"
                segments={[
                  { value: Math.max(1, data.funnel.newLeads), tone: "warn" },
                  {
                    value: Math.max(1, data.funnel.demosLast30Days),
                    tone: "yellow",
                  },
                  {
                    value: Math.max(1, data.funnel.activePaidTenants),
                    tone: "accent",
                  },
                ]}
              />
              <ul className="mt-3 space-y-1.5 text-xs">
                <li className="flex justify-between">
                  <span>{t("New leads")}</span>
                  <b className="tabular">{data.funnel.newLeads}</b>
                </li>
                <li className="flex justify-between">
                  <span>{t("Demos (30d)")}</span>
                  <b className="tabular">{data.funnel.demosLast30Days}</b>
                </li>
                <li className="flex justify-between">
                  <span>{t("Paid tenants")}</span>
                  <b className="tabular">{data.funnel.activePaidTenants}</b>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <aside className="min-w-0 space-y-3.5">
          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">
                {t("Recent leads")}
              </h3>
              <Link
                href="/app/leads"
                className="text-xs font-medium text-accent-strong hover:underline"
              >
                {t("View all")}
              </Link>
            </div>
            {data.recentLeads.length === 0 ? (
              <EmptyState
                icon={<Inbox className="h-5 w-5" />}
                title={t("No leads yet.")}
                className="py-8"
              />
            ) : (
              <div>
                {data.recentLeads.slice(0, 6).map((lead) => (
                  <ListRow
                    key={lead.id}
                    className="px-5"
                    title={lead.name}
                    subtitle={`${lead.company} · ${lead.source}`}
                    value={new Date(lead.createdAt).toLocaleDateString()}
                    status={lead.status}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">
                {t("Recent payments")}
              </h3>
              <Link
                href="/app/payments"
                className="text-xs font-medium text-accent-strong hover:underline"
              >
                {t("View all")}
              </Link>
            </div>
            {data.recentPaymentEvents.length === 0 ? (
              <EmptyState
                icon={<Receipt className="h-5 w-5" />}
                title={t("No payment events yet.")}
                className="py-8"
              />
            ) : (
              <div>
                {data.recentPaymentEvents.slice(0, 6).map((ev) => (
                  <ListRow
                    key={ev.id}
                    className="px-5"
                    title={ev.tenant?.name ?? t("Unknown tenant")}
                    subtitle={`${ev.provider} · ${ev.triggerType}`}
                    value={new Date(ev.processedAt).toLocaleDateString()}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
