"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKpiValue, formatPercent } from "@/lib/kpis/format";
import type { CategoryScore, ScoredKpi } from "@/lib/kpis/types";
import { t } from "@/i18n";

const PALETTE = [
  "hsl(199 89% 32%)",
  "hsl(173 45% 32%)",
  "hsl(215 28% 32%)",
  "hsl(38 82% 46%)",
  "hsl(262 42% 48%)",
  "hsl(0 62% 48%)",
];

export function KpiCharts({
  items,
  categories,
  onSelect,
  simple = false,
}: {
  items: ScoredKpi[];
  categories: CategoryScore[];
  onSelect: (id: string) => void;
  simple?: boolean;
}) {
  if (simple) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Target vs result")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("Grey bar is the target. Blue bar is the result. Click a row to open it.")}</p>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-slate-400" /> {t("Target")}</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-primary" /> {t("Result")}</span>
          </div>
          <TargetActualChart items={items.slice(0, 8)} onSelect={onSelect} />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Target vs actual")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("Click a bar to open the KPI definition and evidence")}</p>
        </CardHeader>
        <CardContent>
          <TargetActualChart items={items.slice(0, 8)} onSelect={onSelect} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Performance trend")}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("Average achievement across review snapshots")}</p>
        </CardHeader>
        <CardContent>
          <TrendChart items={items} onSelect={onSelect} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Category score distribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CategoryBars categories={categories} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Previous period comparison")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviousCompare items={items.slice(0, 8)} onSelect={onSelect} />
        </CardContent>
      </Card>
    </div>
  );
}

function TargetActualChart({
  items,
  onSelect,
}: {
  items: ScoredKpi[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return <EmptyChart />;
  const rowH = 36;
  const height = items.length * rowH + 8;
  const width = 640;
  const labelW = 150;
  const plotW = width - labelW - 16;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {items.map((k, i) => {
        const y = i * rowH + 6;
        const max = Math.max(k.targetValue ?? 0, k.actualValue ?? 0, 1);
        const tW = ((k.targetValue ?? 0) / max) * plotW;
        const aW = ((k.actualValue ?? 0) / max) * plotW;
        return (
          <g
            key={k.id}
            className="cursor-pointer"
            onClick={() => onSelect(k.id)}
          >
            <text
              x={0}
              y={y + 16}
              fontSize="11"
              className="fill-muted-foreground"
            >
              {truncate(k.title, 22)}
            </text>
            <rect x={labelW} y={y} width={plotW} height={24} rx="6" className="fill-secondary" />
            <rect
              x={labelW}
              y={y + 3}
              width={Math.max(tW, 0)}
              height={8}
              rx="3"
              fill="hsl(215 16% 72%)"
            />
            <rect
              x={labelW}
              y={y + 13}
              width={Math.max(aW, 0)}
              height={8}
              rx="3"
              fill="hsl(199 89% 32%)"
            />
            <text x={labelW + plotW + 4} y={y + 16} fontSize="10" className="fill-foreground">
              {formatPercent(k.achievementPercent, 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({
  items,
  onSelect,
}: {
  items: ScoredKpi[];
  onSelect: (id: string) => void;
}) {
  const buckets = new Map<string, number[]>();
  for (const kpi of items) {
    for (const h of kpi.history) {
      const key = h.reviewDate.slice(0, 10);
      const ach = kpi.targetValue
        ? kpi.direction === "lower"
          ? (kpi.targetValue / Math.max(h.actualValue, 0.0001)) * 100
          : (h.actualValue / kpi.targetValue) * 100
        : h.actualValue;
      const list = buckets.get(key) ?? [];
      list.push(ach);
      buckets.set(key, list);
    }
  }
  const points = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date,
      value: vals.reduce((s, n) => s + n, 0) / vals.length,
    }));
  if (points.length === 0) return <EmptyChart />;

  const width = 640;
  const height = 220;
  const pad = { l: 36, r: 12, t: 12, b: 28 };
  const min = Math.min(...points.map((p) => p.value), 0);
  const max = Math.max(...points.map((p) => p.value), 100);
  const span = Math.max(max - min, 1);
  const x = (i: number) =>
    pad.l + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (height - pad.t - pad.b);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${d} L ${x(points.length - 1).toFixed(1)} ${height - pad.b} L ${x(0).toFixed(1)} ${height - pad.b} Z`;
  const firstKpi = items[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {[0, 50, 100].map((mark) => (
        <g key={mark}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={y(mark)}
            y2={y(mark)}
            className="stroke-border"
            strokeDasharray="3 4"
          />
          <text x={4} y={y(mark) + 3} fontSize="10" className="fill-muted-foreground">
            {mark}
          </text>
        </g>
      ))}
      <path d={area} fill="hsl(199 89% 32% / 0.12)" />
      <path d={d} fill="none" stroke="hsl(199 89% 32%)" strokeWidth="2.5" />
      {points.map((p, i) => (
        <circle
          key={p.date}
          cx={x(i)}
          cy={y(p.value)}
          r="4.5"
          fill="white"
          stroke="hsl(199 89% 32%)"
          strokeWidth="2"
          className="cursor-pointer"
          onClick={() => firstKpi && onSelect(firstKpi.id)}
        >
          <title>
            {p.date}: {p.value.toFixed(1)}
          </title>
        </circle>
      ))}
      {points.map((p, i) =>
        i === 0 || i === points.length - 1 ? (
          <text
            key={`l-${p.date}`}
            x={x(i)}
            y={height - 8}
            fontSize="10"
            textAnchor={i === 0 ? "start" : "end"}
            className="fill-muted-foreground"
          >
            {p.date.slice(5)}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function CategoryBars({ categories }: { categories: CategoryScore[] }) {
  if (categories.length === 0) return <EmptyChart />;
  const width = 640;
  const rowH = 40;
  const height = categories.length * rowH + 4;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {categories.map((c, i) => {
        const y = i * rowH + 8;
        const w = ((c.score ?? 0) / 100) * 360;
        return (
          <g key={c.id}>
            <text x={0} y={y + 14} fontSize="12" className="fill-foreground">
              {c.label}
            </text>
            <rect x={200} y={y} width={360} height={16} rx="8" className="fill-secondary" />
            <rect
              x={200}
              y={y}
              width={Math.max(w, 0)}
              height={16}
              rx="8"
              fill={PALETTE[i % PALETTE.length]}
            />
            <text x={572} y={y + 13} fontSize="11" className="fill-muted-foreground">
              {c.score == null ? "-" : c.score.toFixed(0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PreviousCompare({
  items,
  onSelect,
}: {
  items: ScoredKpi[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return <EmptyChart />;
  const width = 640;
  const rowH = 36;
  const height = items.length * rowH + 8;
  return (
    <div>
      <div className="mb-2 flex gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-slate-400" /> {t("Previous")}</span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-primary" /> {t("Current")}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {items.map((k, i) => {
          const y = i * rowH + 6;
          const prev = k.history[1]?.actualValue ?? null;
          const curr = k.actualValue ?? 0;
          const max = Math.max(k.targetValue ?? 0, curr, prev ?? 0, 1);
          return (
            <g key={k.id} className="cursor-pointer" onClick={() => onSelect(k.id)}>
              <text x={0} y={y + 16} fontSize="11" className="fill-muted-foreground">
                {truncate(k.title, 20)}
              </text>
              <rect
                x={150}
                y={y + 4}
                width={((prev ?? 0) / max) * 200}
                height={8}
                rx="3"
                className="fill-slate-400"
              />
              <rect
                x={360}
                y={y + 4}
                width={(curr / max) * 200}
                height={8}
                rx="3"
                className="fill-primary"
              />
              <text x={570} y={y + 14} fontSize="10" className="fill-foreground">
                {formatKpiValue(k.actualValue, k.unit)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyChart() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      {t("Not enough values to chart this period.")}</p>
  );
}

function truncate(value: string, n: number) {
  return value.length > n ? `${value.slice(0, n - 1)}…` : value;
}
