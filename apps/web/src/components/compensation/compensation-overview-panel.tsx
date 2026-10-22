import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BandBadge,
  ChangeStatusBadge,
} from "@/components/compensation/compensation-status-badge";
import {
  HatchBar,
  LegendList,
  ListRow,
  SegmentBar,
} from "@/components/elevora";
import {
  componentMonthlyAmount,
  isComponentActive,
  isEarning,
  toMonthlyEquivalent,
} from "@/lib/compensation/calc";
import {
  formatDate,
  formatHours,
  formatMoney,
  payStructureLabel,
} from "@/lib/compensation/format";
import type {
  ChangeRequest,
  CompEmployee,
  CompReport,
  OverviewSummary,
  SalaryHistoryEntry,
} from "@/lib/compensation/types";
import type { CompensationStore } from "@/lib/compensation/store";
import { t } from "@/i18n";

export function CompensationOverviewPanel({
  summary,
  report,
  pending,
  recent,
  employees,
  store,
  onOpenEmployee,
  onOpenRequest,
  onGoApprovals,
}: {
  summary: OverviewSummary;
  report: CompReport;
  pending: ChangeRequest[];
  recent: SalaryHistoryEntry[];
  employees: CompEmployee[];
  store: CompensationStore;
  onOpenEmployee: (id: string) => void;
  onOpenRequest: (id: string) => void;
  onGoApprovals: () => void;
}) {
  const currency = summary.currency;
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const asOf = new Date().toISOString().slice(0, 10);

  let base = 0;
  let allowances = 0;
  let overtime = 0;
  for (const emp of employees.filter((e) => e.status === "active")) {
    const rec = store.record(emp.id);
    if (!rec) continue;
    const monthly = toMonthlyEquivalent(rec);
    base += monthly;
    for (const c of store.components().filter((x) => x.employeeId === emp.id)) {
      if (!isComponentActive(c, asOf) || !isEarning(c.kind)) continue;
      if (c.kind === "base_salary") continue;
      if (c.kind === "overtime") {
        overtime += componentMonthlyAmount(c, monthly);
      } else {
        allowances += componentMonthlyAmount(c, monthly);
      }
    }
  }
  const variable =
    summary.bonusesThisCycle + summary.commissionsThisCycle;
  const mix = [
    { value: Math.max(base, 0), tone: "accent" as const, label: t("Base") },
    { value: Math.max(allowances, 0), tone: "soft" as const, label: t("Allowances") },
    { value: Math.max(variable, 0), tone: "yellow" as const, label: t("Variable") },
    { value: Math.max(overtime, 0), tone: "warn" as const, label: t("Overtime") },
  ];

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <Card className="border-line bg-surface lg:col-span-7">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Payroll mix")}</CardTitle>
          <p className="text-xs text-ink-muted">
            {t("Base, allowances, variable, and overtime for the current cycle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SegmentBar segments={mix} />
          <LegendList
            items={mix.map((m) => ({
              label: m.label,
              value: formatMoney(m.value, currency, { compact: true }),
              tone: m.tone,
            }))}
          />
          <div className="space-y-3 border-t border-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t("Cost by team")}
            </p>
            <DepartmentBars items={report.costByTeam} currency={currency} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-line bg-surface lg:col-span-5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-ink">{t("Recent changes")}</CardTitle>
            <button
              type="button"
              className="text-xs text-accent-ink hover:underline"
              onClick={onGoApprovals}
            >
              {t("Approvals")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {recent.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-ink-muted">
              {t("No changes in the last 90 days.")}
            </p>
          ) : (
            <ul>
              {recent.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full min-w-0 text-left"
                    onClick={() => onOpenEmployee(h.employeeId)}
                  >
                    <ListRow
                      title={nameOf(h.employeeId)}
                      subtitle={formatDate(h.effectiveDate)}
                      value={formatMoney(h.newAmount, currency)}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-surface lg:col-span-5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base text-ink">{t("Pending approvals")}</CardTitle>
            <button
              type="button"
              className="text-xs text-accent-ink hover:underline"
              onClick={onGoApprovals}
            >
              {t("View all")}
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("Nothing waiting on HR.")}</p>
          ) : (
            pending.slice(0, 4).map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full flex-col rounded-sm border border-line bg-surface-2 px-3 py-2 text-left hover:border-line-strong"
                onClick={() => onOpenRequest(r.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink">{r.employeeName}</span>
                  <ChangeStatusBadge status={r.status} />
                </span>
                <span className="mt-1 text-xs text-ink-muted">
                  {formatMoney(r.newAmount, r.currency)} · {formatDate(r.effectiveDate)}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-surface lg:col-span-7">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Outside band")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.outOfBand.length === 0 ? (
            <p className="text-sm text-ink-muted">
              {t("All employees sit inside their grade.")}
            </p>
          ) : (
            report.outOfBand.map((row) => (
              <button
                key={row.employeeId}
                type="button"
                className="flex w-full items-center justify-between rounded-sm px-1 py-1.5 text-left text-sm hover:bg-surface-2"
                onClick={() => onOpenEmployee(row.employeeId)}
              >
                <span className="text-ink">{row.name}</span>
                <BandBadge position={row.position} />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-surface lg:col-span-12">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Pay structures in use")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {employees.map((e) => {
            const rec = store.record(e.id);
            return rec ? (
              <span
                key={e.id}
                className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted"
              >
                {e.name.split(" ")[0]} · {payStructureLabel(rec.payStructure)}
                {rec.payStructure === "hourly"
                  ? ` · ${formatHours(store.cycleHours(e.id)?.workedHours ?? 0)}`
                  : ""}
              </span>
            ) : null;
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentBars({
  items,
  currency,
}: {
  items: { label: string; amount: number }[];
  currency: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink-muted">{t("No cost data.")}</p>;
  }
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-ink">{item.label}</span>
            <span className="tabular-nums font-medium text-ink">
              {formatMoney(item.amount, currency, { compact: true })}
            </span>
          </div>
          <HatchBar
            percent={Math.max((item.amount / max) * 100, 4)}
            size="xs"
            tone="accent"
          />
        </div>
      ))}
    </div>
  );
}
