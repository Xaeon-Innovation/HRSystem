"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  CheckCheck,
  FileDown,
  Megaphone,
  MoreHorizontal,
  Pencil,
  Plus,
  Target,
  UserPlus,
} from "lucide-react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { PlatformOverview } from "@/components/platform-overview";
import type { LeaveSnapshot } from "@/lib/leave";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  AccentCard,
  EmptyState,
  HatchBar,
  IconTile,
  LegendList,
  Notice,
  PageHeader,
  QuickActions,
  SegmentBar,
  SegmentGauge,
  StatBlock,
  TipCard,
} from "@/components/elevora";

type Dashboard = {
  clockedIn: number;
  liveLocations: number;
  kpis: number;
  unreadNotifications: number;
};

type SetupStatus = {
  dismissed: boolean;
  steps: { id: string; done: boolean; href: string }[];
  progress: {
    doneAll: number;
    totalAll: number;
    allRequiredDone: boolean;
  };
};

function dashboardDateSubtitle() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greetingTitle() {
  const user = getUser();
  const name = user?.name?.trim();
  if (!name) return t("Operations");
  const first = name.split(/\s+/)[0];
  const hour = new Date().getHours();
  if (hour < 12) return `${t("Good morning")}, ${first}`;
  if (hour < 17) return `${t("Good afternoon")}, ${first}`;
  return `${t("Good evening")}, ${first}`;
}

const LEAVE_TONES = [
  "warn",
  "yellow",
  "soft",
  "accent",
  "accent",
  "idle",
] as const;

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
  const router = useRouter();
  const user = useMemo(() => getUser(), []);
  const [data, setData] = useState<Dashboard | null>(null);
  const [leave, setLeave] = useState<LeaveSnapshot | null>(null);
  const [setup, setSetup] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Dashboard>("/v1/admin/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    api<{ leave: LeaveSnapshot }>("/v1/leave")
      .then((res) => setLeave(res.leave))
      .catch(() => setLeave(null));
  }, []);

  useEffect(() => {
    if (user?.role !== "tenant_admin" && user?.role !== "super_admin") return;
    api<SetupStatus>("/v1/admin/setup-status", { skipCache: true })
      .then(setSetup)
      .catch(() => setSetup(null));
  }, [user?.role]);

  const leaveByType = useMemo(() => {
    const requests = leave?.requests ?? [];
    const counts = new Map<string, number>();
    for (const r of requests) {
      const key = r.leaveTypeName || t("Other");
      counts.set(String(key), (counts.get(String(key)) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0);
    const segments = entries.map(([, n], i) => ({
      value: n,
      tone: LEAVE_TONES[i % LEAVE_TONES.length],
    }));
    const legend = entries.map(([label, n], i) => ({
      label,
      value: total ? `${Math.round((n / total) * 100)}%` : "0%",
      tone: LEAVE_TONES[i % LEAVE_TONES.length],
    }));
    return { total, segments, legend };
  }, [leave]);

  if (error) return <p className="text-sm text-destructive">{t(error)}</p>;
  if (!data) return <PageSkeleton />;

  const pendingLeave = (leave?.requests ?? []).filter(
    (r) => r.status === "pending",
  ).length;
  const leaveLabel =
    pendingLeave > 0
      ? `${t("Review leave")} · ${pendingLeave}`
      : t("Review leave");

  const plan = user?.plan;
  const workspace = user?.workspace;
  const seatLimit = plan?.seatLimit ?? null;
  const seatsUsed = data.clockedIn;
  const seatPct =
    seatLimit && seatLimit > 0
      ? Math.min(100, Math.round((seatsUsed / seatLimit) * 1000) / 10)
      : null;

  const nextSetup = setup?.steps.find((s) => !s.done);
  const showTip =
    setup &&
    !setup.dismissed &&
    !setup.progress.allRequiredDone &&
    setup.progress.totalAll > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={greetingTitle()}
        subtitle={`${dashboardDateSubtitle()} · ${t("live workforce first, then goals and leave.")}`}
        actions={
          <>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/map">{t("Open live map")}</Link>
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/app/leave">{leaveLabel}</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-3.5">
          {/* Hero */}
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_210px]">
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-stat-lg font-semibold tabular tracking-tight text-ink">
                      {data.clockedIn}{" "}
                      <span className="text-[20px] font-medium text-ink-muted">
                        {seatLimit != null ? `/ ${seatLimit}` : null}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t("Clocked in now")} · {t("live presence")}
                    </p>
                  </div>
                  <span className="inline-flex self-start rounded-full border border-line bg-surface-2 px-2.5 py-1 text-2xs font-medium text-ink-muted">
                    {t("This week")}
                  </span>
                </div>
                <div className="mt-6 rounded-md border border-dashed border-line bg-surface-2/60 px-4 py-8">
                  <EmptyState
                    className="py-0"
                    title={t("Week attendance chart")}
                    subtitle={t(
                      "Shows when daily attendance aggregates are available.",
                    )}
                  />
                </div>
              </div>

              <div className="flex min-w-0 flex-row gap-4 overflow-x-auto border-t border-line pt-4 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-s lg:border-t-0 lg:ps-5 lg:pt-0">
                <KpiColItem
                  label={t("Live on map")}
                  value={data.liveLocations}
                  href="/app/map"
                />
                <KpiColItem
                  label={t("Unread alerts")}
                  value={data.unreadNotifications}
                  href="/app/notifications"
                  warn={
                    data.unreadNotifications > 0
                      ? t("Open inbox to review")
                      : undefined
                  }
                />
                <KpiColItem
                  label={t("KPIs")}
                  value={data.kpis}
                  href="/app/kpis"
                />
              </div>
            </div>
          </section>

          {/* Seat + Tip */}
          <div className="grid gap-3.5 sm:grid-cols-2">
            <section className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {t("Seat usage")}
                  </h3>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {plan?.name ?? t("Current plan")}
                    {seatLimit != null
                      ? ` · ${t("Up to {n} seats", { n: seatLimit })}`
                      : null}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("Manage plan")}
                >
                  <Link href="/app/billing">
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              {seatPct != null && seatLimit != null ? (
                <>
                  <HatchBar percent={seatPct} className="mt-4" />
                  <div className="mt-2 flex justify-between text-xs">
                    <b className="tabular text-ink">
                      {seatsUsed} {t("clocked in")}
                    </b>
                    <span className="tabular text-ink-muted">{seatLimit}</span>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-xs text-ink-muted">
                  {t("Seat limit is not set on this plan.")}
                </p>
              )}
            </section>

            {showTip && nextSetup ? (
              <TipCard
                title={t("Finish setting up your workspace")}
                copy={
                  <>
                    {setup!.progress.doneAll} {t("of")}{" "}
                    {setup!.progress.totalAll} {t("done")}.{" "}
                    {t("Complete the next step to unlock the rest.")}
                  </>
                }
                href={nextSetup.href}
                linkLabel={t("Continue setup")}
              />
            ) : (
              <section className="rounded-lg border border-line bg-surface p-5">
                <h3 className="text-sm font-semibold text-ink">
                  {t("Goals and leave")}
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  {pendingLeave > 0
                    ? t("{n} leave requests waiting for review.", {
                        n: pendingLeave,
                      })
                    : t("No pending leave in the queue.")}{" "}
                  {data.kpis > 0
                    ? t("{n} active KPIs.", { n: data.kpis })
                    : t("Add KPIs when you are ready.")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/leave">{t("Leave")}</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/app/kpis">{t("KPIs")}</Link>
                  </Button>
                </div>
              </section>
            )}
          </div>

          {/* Leave / Attendance / KPI */}
          <div className="grid gap-3.5 md:grid-cols-3">
            <section className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {t("Leave mix")}
                  </h3>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {t("Open requests")}
                  </p>
                </div>
              </div>
              {leaveByType.total > 0 ? (
                <>
                  <div className="mt-3 text-stat font-semibold tabular text-ink">
                    {leaveByType.total}{" "}
                    <span className="text-base font-medium text-ink-muted">
                      {t("requests")}
                    </span>
                  </div>
                  <SegmentBar
                    className="mt-3"
                    segments={leaveByType.segments}
                  />
                  <LegendList className="mt-3" items={leaveByType.legend} />
                </>
              ) : (
                <EmptyState
                  className="py-6"
                  title={t("No leave requests")}
                  subtitle={t("Mix appears once people submit leave.")}
                />
              )}
            </section>

            <section className="rounded-lg border border-line bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink">
                {t("Attendance health")}
              </h3>
              <p className="mt-0.5 text-2xs text-ink-muted">{t("Live today")}</p>
              <div className="mt-3 text-lg font-semibold tabular text-ink">
                {data.clockedIn}{" "}
                <span className="text-sm font-medium text-ink-muted">
                  {t("clocked in")}
                </span>
              </div>
              <div className="mt-4">
                <SegmentGauge
                  percent={
                    seatLimit && seatLimit > 0
                      ? Math.min(
                          100,
                          Math.round((data.clockedIn / seatLimit) * 100),
                        )
                      : Math.min(100, data.clockedIn > 0 ? 78 : 0)
                  }
                  label={
                    seatLimit && seatLimit > 0
                      ? `${Math.round((data.clockedIn / seatLimit) * 100)}%`
                      : `${data.clockedIn}`
                  }
                  sub={t("of seat capacity")}
                />
              </div>
            </section>

            <section className="rounded-lg border border-line bg-surface p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {t("KPI attention")}
                  </h3>
                  <p className="mt-0.5 text-2xs text-ink-muted">
                    {data.kpis} {t("active")}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/app/kpis">
                    <Plus className="me-1 h-3.5 w-3.5" />
                    {t("Add KPI")}
                  </Link>
                </Button>
              </div>
              {data.kpis > 0 ? (
                <Link
                  href="/app/kpis"
                  className="mt-4 flex items-center gap-2.5 rounded-md border border-line bg-surface-2/50 p-3 transition-colors hover:border-line-strong"
                >
                  <IconTile tone="accent">
                    <Target className="h-4 w-4" />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 text-xs">
                      <b className="truncate text-ink">{t("Open scorecards")}</b>
                      <span className="tabular text-ink-muted">{data.kpis}</span>
                    </div>
                    <HatchBar
                      percent={Math.min(100, data.kpis * 8)}
                      size="sm"
                      className="mt-2"
                    />
                  </div>
                </Link>
              ) : (
                <EmptyState
                  className="py-6"
                  title={t("No KPIs yet")}
                  subtitle={t("Define metrics to track this period.")}
                  action={
                    <Button asChild size="sm">
                      <Link href="/app/kpis">{t("Open KPIs")}</Link>
                    </Button>
                  }
                />
              )}
            </section>
          </div>
        </div>

        {/* Rail */}
        <aside className="min-w-0 space-y-3.5">
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink">
                  {t("Workspace")}
                </h3>
                <p className="text-2xs text-ink-muted">{t("Quick actions")}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/settings">{t("Brand")}</Link>
              </Button>
            </div>

            {plan || workspace?.tenantName ? (
              <AccentCard className="mb-3">
                <div className="relative z-[1] flex justify-between text-2xs font-semibold uppercase tracking-wide">
                  <span>{plan?.name ?? t("Plan")}</span>
                  <span className="truncate ms-2">
                    {workspace?.tenantName ?? ""}
                  </span>
                </div>
                <div className="h-10" />
                <div className="relative z-[1] flex justify-between">
                  <div>
                    <div className="text-2xs opacity-75">{t("Seats")}</div>
                    <b className="tabular">
                      {seatLimit != null
                        ? `${data.clockedIn} / ${seatLimit}`
                        : data.clockedIn}
                    </b>
                  </div>
                  <div className="text-end">
                    <div className="text-2xs opacity-75">{t("Live map")}</div>
                    <b className="tabular">{data.liveLocations}</b>
                  </div>
                </div>
              </AccentCard>
            ) : null}

            <QuickActions
              actions={[
                {
                  id: "add",
                  label: t("Add"),
                  icon: <UserPlus className="h-5 w-5" />,
                  onClick: () => router.push("/app/employees"),
                },
                {
                  id: "announce",
                  label: t("Announce"),
                  icon: <Megaphone className="h-5 w-5" />,
                  onClick: () => router.push("/app/notifications"),
                },
                {
                  id: "approve",
                  label: t("Approve"),
                  icon: <CheckCheck className="h-5 w-5" />,
                  onClick: () => router.push("/app/leave"),
                },
                {
                  id: "export",
                  label: t("Export"),
                  icon: <FileDown className="h-5 w-5" />,
                  onClick: () => router.push("/app/attendance/hours"),
                },
                {
                  id: "more",
                  label: t("More"),
                  icon: <MoreHorizontal className="h-5 w-5" />,
                  onClick: () => router.push("/app/settings"),
                },
              ]}
            />
          </section>

          <section className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h3 className="text-sm font-semibold text-ink">
                {t("Live activity")}
              </h3>
              <span className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-2xs text-ink-muted">
                {t("Today")}
              </span>
            </div>
            <EmptyState
              icon={<Activity className="h-5 w-5" />}
              title={t("No live feed yet")}
              subtitle={t(
                "When a real-time activity stream is connected, events will appear here.",
              )}
            />
          </section>

          {data.unreadNotifications > 0 ? (
            <Notice tone="warn">
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0" />
                <Link href="/app/notifications" className="underline-offset-2 hover:underline">
                  {data.unreadNotifications} {t("unread alerts")}
                </Link>
              </span>
            </Notice>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function KpiColItem({
  label,
  value,
  href,
  warn,
}: {
  label: string;
  value: number;
  href: string;
  warn?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "min-w-[120px] shrink-0 border-line py-1 lg:min-w-0 lg:border-b lg:py-4 lg:last:border-b-0",
      )}
    >
      <div className="text-2xs text-ink-muted">{label}</div>
      <div className="mt-1 text-stat font-semibold tabular text-ink">{value}</div>
      {warn ? (
        <p className="mt-1 text-2xs font-medium text-warn">{warn}</p>
      ) : null}
    </Link>
  );
}
