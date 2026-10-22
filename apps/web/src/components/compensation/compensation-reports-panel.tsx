import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandBadge } from "@/components/compensation/compensation-status-badge";
import { AreaLine, HatchBar, StatBlock } from "@/components/elevora";
import {
  formatDate,
  formatMoney,
  formatPercent,
} from "@/lib/compensation/format";
import type { CompEmployee, CompReport, OverviewSummary } from "@/lib/compensation/types";
import { t } from "@/i18n";

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

  const growthValues = report.growth.map((g) => g.amount);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="border-line bg-surface lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-ink">
              {t("Compensation growth")}
            </CardTitle>
            <p className="text-xs text-ink-muted">{t("Change events over recent months")}</p>
          </CardHeader>
          <CardContent>
            {growthValues.length >= 2 ? (
              <AreaLine values={growthValues} height={140} />
            ) : (
              <p className="py-8 text-center text-sm text-ink-muted">
                {t("Not enough history.")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-line bg-surface lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-ink">{t("By department")}</CardTitle>
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
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-line bg-surface p-4">
          <StatBlock
            label={t("Pending approvals")}
            value={String(report.pendingApprovals)}
            size="sm"
          />
        </Card>
        <Card className="border-line bg-surface p-4">
          <StatBlock
            label={t("Bonuses this cycle")}
            value={formatMoney(report.totalBonuses, currency)}
            size="sm"
          />
        </Card>
        <Card className="border-line bg-surface p-4">
          <StatBlock
            label={t("Commissions this cycle")}
            value={formatMoney(report.totalCommissions, currency)}
            size="sm"
          />
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-ink">{t("Salary by role")}</CardTitle>
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
        <Card className="border-line bg-surface">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-ink">{t("Average salary by branch")}</CardTitle>
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
      </div>

      <Card className="border-line bg-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Outside salary bands")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.outOfBand.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {t("Everyone in scope sits inside their band.")}
            </p>
          ) : (
            report.outOfBand.map((row) => (
              <button
                key={row.employeeId}
                type="button"
                className="flex w-full items-center justify-between rounded-sm border border-line bg-surface-2 px-3 py-2 text-left text-sm hover:border-line-strong"
                onClick={() => onOpenEmployee(row.employeeId)}
              >
                <span>
                  <span className="font-medium text-ink">{row.name}</span>
                  <span className="text-ink-muted"> · {row.role}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-ink">
                    {formatMoney(row.monthly, currency)}
                  </span>
                  <BandBadge position={row.position} />
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Recent salary changes")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.recentChanges.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("No changes in the last 90 days.")}</p>
          ) : (
            report.recentChanges.slice(0, 8).map((h) => (
              <button
                key={h.id}
                type="button"
                className="flex w-full items-center justify-between rounded-sm px-1 py-1.5 text-left text-sm hover:bg-surface-2"
                onClick={() => onOpenEmployee(h.employeeId)}
              >
                <span className="text-ink">
                  {nameOf(h.employeeId)}
                  <span className="text-ink-muted"> · {formatDate(h.effectiveDate)}</span>
                </span>
                <span
                  className={
                    h.changeAmount >= 0
                      ? "tabular-nums text-accent-strong"
                      : "tabular-nums text-danger"
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

function HBar({
  items,
  format,
}: {
  items: { label: string; value: number }[];
  format: (v: number) => string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">{t("Nothing to chart.")}</p>
    );
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-ink">{item.label}</span>
            <span className="shrink-0 tabular-nums font-medium text-ink">
              {format(item.value)}
            </span>
          </div>
          <HatchBar
            percent={Math.max((item.value / max) * 100, 4)}
            size="xs"
            tone="accent"
          />
        </div>
      ))}
    </div>
  );
}
