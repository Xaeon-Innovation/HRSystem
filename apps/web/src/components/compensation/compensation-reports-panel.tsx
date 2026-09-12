import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandBadge } from "@/components/compensation/compensation-status-badge";
import {
  formatDate,
  formatMoney,
  formatPercent,
} from "@/lib/compensation/format";
import type { CompEmployee, CompReport, OverviewSummary } from "@/lib/compensation/types";
import { t } from "@/i18n";

const PALETTE = [
  "hsl(199 89% 32%)",
  "hsl(173 45% 32%)",
  "hsl(215 28% 32%)",
  "hsl(38 82% 46%)",
  "hsl(262 42% 48%)",
  "hsl(0 62% 48%)",
];

export function CompensationReportsPanel({
  report,
  summary,
  employees,
  onOpenEmployee,
}: {
  report: CompReport;
  summary: OverviewSummary;
  employees: CompEmployee[];
  onOpenEmployee: (id: string) => void;
}) {
  const currency = summary.currency;
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Total compensation by department")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HBar
              items={report.byDepartment.map((d) => ({
                label: `${d.label} (${d.people})`,
                value: d.amount,
              }))}
              format={(v) => formatMoney(v, currency, { compact: true })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Salary by role")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HBar
              items={report.byRole.map((d) => ({
                label: `${d.label} (${d.people})`,
                value: d.amount,
              }))}
              format={(v) => formatMoney(v, currency, { compact: true })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Average salary by branch")}</CardTitle>
          </CardHeader>
          <CardContent>
            <HBar
              items={report.byBranch.map((d) => ({
                label: `${d.label} (${d.people})`,
                value: d.average,
              }))}
              format={(v) => formatMoney(v, currency, { compact: true })}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Compensation growth (change events)")}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              points={report.growth.map((g) => ({ label: g.month.slice(5), value: g.amount }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Pending approvals" value={String(report.pendingApprovals)} />
        <MiniStat label="Bonuses this cycle" value={formatMoney(report.totalBonuses, currency)} />
        <MiniStat
          label="Commissions this cycle"
          value={formatMoney(report.totalCommissions, currency)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Outside salary bands")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.outOfBand.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Everyone in scope sits inside their band.")}</p>
          ) : (
            report.outOfBand.map((row) => (
              <button
                key={row.employeeId}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border bg-card px-3 py-2 text-left text-sm hover:bg-accent/40"
                onClick={() => onOpenEmployee(row.employeeId)}
              >
                <span>
                  <span className="font-medium">{row.name}</span>
                  <span className="text-muted-foreground"> · {row.role}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatMoney(row.monthly, currency)}</span>
                  <BandBadge position={row.position} />
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Recent salary changes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.recentChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No changes in the last 90 days.")}</p>
          ) : (
            report.recentChanges.slice(0, 8).map((h) => (
              <button
                key={h.id}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-sm hover:bg-accent/40"
                onClick={() => onOpenEmployee(h.employeeId)}
              >
                <span>
                  {nameOf(h.employeeId)}
                  <span className="text-muted-foreground"> · {formatDate(h.effectiveDate)}</span>
                </span>
                <span
                  className={
                    h.changeAmount >= 0 ? "tabular-nums text-emerald-700" : "tabular-nums text-rose-700"
                  }
                >
                  {formatMoney(h.changeAmount, currency)} {formatPercent(h.changePercent)}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function HBar({
  items,
  format,
}: {
  items: { label: string; value: number }[];
  format: (v: number) => string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("Nothing to chart.")}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const width = 640;
  const rowH = 36;
  const height = items.length * rowH + 8;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      {items.map((item, i) => {
        const y = i * rowH + 6;
        const w = (item.value / max) * 360;
        return (
          <g key={item.label}>
            <text x={0} y={y + 14} fontSize="11" className="fill-muted-foreground">
              {item.label.length > 28 ? `${item.label.slice(0, 27)}…` : item.label}
            </text>
            <rect x={220} y={y} width={360} height={16} rx="8" className="fill-secondary" />
            <rect
              x={220}
              y={y}
              width={Math.max(w, 0)}
              height={16}
              rx="8"
              fill={PALETTE[i % PALETTE.length]}
            />
            <text x={590} y={y + 13} fontSize="11" className="fill-foreground">
              {format(item.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("Not enough history.")}</p>;
  }
  const width = 640;
  const height = 200;
  const pad = { l: 8, r: 8, t: 12, b: 28 };
  const min = Math.min(...points.map((p) => p.value), 0);
  const max = Math.max(...points.map((p) => p.value), 1);
  const span = Math.max(max - min, 1);
  const x = (i: number) =>
    pad.l + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (height - pad.t - pad.b);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(" ");
  const area = `${d} L ${x(points.length - 1).toFixed(1)} ${height - pad.b} L ${x(0).toFixed(1)} ${height - pad.b} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img">
      <path d={area} fill="hsl(199 89% 32% / 0.12)" />
      <path d={d} fill="none" stroke="hsl(199 89% 32%)" strokeWidth="2.5" />
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.value)} r="4" fill="white" stroke="hsl(199 89% 32%)" strokeWidth="2" />
          {(i === 0 || i === points.length - 1) && (
            <text
              x={x(i)}
              y={height - 8}
              fontSize="10"
              textAnchor={i === 0 ? "start" : "end"}
              className="fill-muted-foreground"
            >
              {p.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
