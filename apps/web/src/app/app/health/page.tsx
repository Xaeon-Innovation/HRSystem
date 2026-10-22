"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlarmClockOff,
  BellOff,
  RefreshCwOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  EmptyState,
  IconTile,
  Notice,
  PageHeader,
  Timeline,
  type TimelineItem,
  type TimelineTone,
} from "@/components/elevora";
import { t } from "@/i18n";

type Metrics = {
  aggregates: { metric: string; total: number }[];
  recent: {
    id: string;
    metric: string;
    value: number;
    createdAt: string;
    meta: Record<string, unknown>;
  }[];
};

const METRIC_META: Record<
  string,
  { icon: typeof Activity; tone: "warn" | "danger" | "accent" | "neutral"; label: string }
> = {
  missed_clock_out: {
    icon: AlarmClockOff,
    tone: "warn",
    label: "Missed clock-outs",
  },
  sync_failure: {
    icon: RefreshCwOff,
    tone: "danger",
    label: "Sync failures",
  },
  notification_issue: {
    icon: BellOff,
    tone: "neutral",
    label: "Notification issues",
  },
  uptime: {
    icon: Activity,
    tone: "accent",
    label: "Uptime",
  },
};

function toneForMetric(metric: string): TimelineTone {
  const m = metric.toLowerCase();
  if (m.includes("fail") || m.includes("error") || m.includes("sync")) {
    return "danger";
  }
  if (m.includes("miss") || m.includes("warn")) return "warn";
  return "accent";
}

export default function HealthPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>("/v1/admin/health-metrics")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const timelineItems = useMemo((): TimelineItem[] => {
    if (!data) return [];
    return data.recent.slice(0, 12).map((r) => ({
      id: r.id,
      title: `${r.metric} · ${r.value}`,
      meta: new Date(r.createdAt).toLocaleString(),
      tone: toneForMetric(r.metric),
    }));
  }, [data]);

  if (error) return <Notice tone="warn">{error}</Notice>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Health")}
        subtitle={t("Operational metrics")}
      />

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {data.aggregates.map((a) => {
          const meta = METRIC_META[a.metric];
          const Icon = meta?.icon ?? Activity;
          const tone = meta?.tone ?? "neutral";
          const label = meta?.label ?? a.metric;
          return (
            <Card key={a.metric} className="min-w-0">
              <CardContent className="pt-5">
                <IconTile
                  tone={
                    tone === "accent"
                      ? "accent"
                      : tone === "warn"
                        ? "warn"
                        : tone === "danger"
                          ? "danger"
                          : "neutral"
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </IconTile>
                <div className="mt-3 text-stat font-semibold tabular tracking-tight text-ink">
                  {a.total}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{t(label)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Recent events")}</CardTitle>
        </CardHeader>
        <CardContent>
          {timelineItems.length === 0 ? (
            <EmptyState
              icon={<Activity className="h-5 w-5" aria-hidden />}
              title={t("No recent events")}
              className="py-8"
            />
          ) : (
            <Timeline items={timelineItems} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
