"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  MapPinned,
  Palmtree,
  Timer,
} from "lucide-react";
import { api, getUser } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PlatformOverview } from "@/components/platform-overview";
import type { LeaveSnapshot } from "@/lib/leave";
import { t } from "@/i18n";

type Dashboard = {
  clockedIn: number;
  liveLocations: number;
  kpis: number;
  unreadNotifications: number;
};

export default function DashboardPage() {
  const [mode, setMode] = useState<"loading" | "platform" | "tenant">(
    "loading",
  );

  useEffect(() => {
    const user = getUser();
    if (user?.role === "super_admin" && !user.tenantId) {
      setMode("platform");
    } else {
      setMode("tenant");
    }
  }, []);

  if (mode === "loading") return <PageSkeleton />;
  if (mode === "platform") return <PlatformOverview />;
  return <TenantDashboard />;
}

function TenantDashboard() {
  const redesign = useUiRedesign();
  const [data, setData] = useState<Dashboard | null>(null);
  const [pendingLeave, setPendingLeave] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/v1/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!redesign) return;
    api<{ leave: LeaveSnapshot }>("/v1/leave")
      .then((res) => {
        const n = (res.leave.requests ?? []).filter(
          (r) => r.status === "pending",
        ).length;
        setPendingLeave(n);
      })
      .catch(() => setPendingLeave(null));
  }, [redesign]);

  if (error) return <p className="text-destructive">{t(error)}</p>;
  if (!data) return <PageSkeleton />;

  if (!redesign) {
    const tiles = [
      { label: t("Clocked in"), value: data.clockedIn },
      { label: t("Live on map"), value: data.liveLocations },
      { label: t("KPIs"), value: data.kpis },
      { label: t("Unread alerts"), value: data.unreadNotifications },
    ];
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Dashboard")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Live workforce pulse for your tenant")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{tile.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const presence = [
    {
      label: t("Clocked in now"),
      value: data.clockedIn,
      href: "/app/clock",
      icon: Timer,
      hint: t("Open shifts"),
    },
    {
      label: t("Live on map"),
      value: data.liveLocations,
      href: "/app/map",
      icon: MapPinned,
      hint: t("Field presence"),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("Operations")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t("Live workforce first, then goals and leave that need attention.")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/map">{t("Open live map")}</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/leave">{t("Review leave")}</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("Live presence")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {presence.map((p) => {
            const Icon = p.icon;
            return (
              <Link key={p.label} href={p.href} className="group">
                <Card className="transition-colors group-hover:border-primary/30">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {p.label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{p.hint}</p>
                    </div>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-semibold tracking-tight">
                      {p.value}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("Exceptions")}
        </h2>
        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium">{t("Unread alerts")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Missed clock-outs, anomalies, and announcements land here.")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-semibold tabular-nums">
                {data.unreadNotifications}
              </span>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link href="/app/notifications">{t("Open alerts")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("Goals & leave")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/app/kpis" className="group">
            <Card className="h-full transition-colors group-hover:border-primary/30">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("KPI attention")}
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{data.kpis}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("Active KPI definitions, drill in for off-track results.")}
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/app/leave" className="group">
            <Card className="h-full transition-colors group-hover:border-primary/30">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("Leave queue")}
                </CardTitle>
                <Palmtree className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {pendingLeave == null ? "-" : pendingLeave}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("Pending requests waiting for a decision.")}
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}
