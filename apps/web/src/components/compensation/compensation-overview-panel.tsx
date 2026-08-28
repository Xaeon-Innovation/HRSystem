import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandBadge, ChangeStatusBadge } from "@/components/compensation/compensation-status-badge";
import { formatDate, formatHours, formatMoney, payStructureLabel } from "@/lib/compensation/format";
import type {
  ChangeRequest,
  CompEmployee,
  CompReport,
  OverviewSummary,
  SalaryHistoryEntry,
} from "@/lib/compensation/types";
import type { CompensationStore } from "@/lib/compensation/store";

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

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cost by team</CardTitle>
          <p className="text-xs text-muted-foreground">
            Monthly equivalent plus recurring allowances and approved cycle incentives
          </p>
        </CardHeader>
        <CardContent>
          <DepartmentBars items={report.costByTeam} currency={currency} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Pending approvals</CardTitle>
            <button type="button" className="text-xs text-primary hover:underline" onClick={onGoApprovals}>
              View all
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting on HR.</p>
          ) : (
            pending.slice(0, 4).map((r) => (
              <button
                key={r.id}
                type="button"
                className="flex w-full flex-col rounded-lg border bg-white/70 px-3 py-2 text-left hover:bg-accent/40"
                onClick={() => onOpenRequest(r.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.employeeName}</span>
                  <ChangeStatusBadge status={r.status} />
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {formatMoney(r.newAmount, r.currency)} · {formatDate(r.effectiveDate)}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Outside band</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.outOfBand.length === 0 ? (
            <p className="text-sm text-muted-foreground">All employees sit inside their grade.</p>
          ) : (
            report.outOfBand.map((row) => (
              <button
                key={row.employeeId}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-sm hover:bg-accent/40"
                onClick={() => onOpenEmployee(row.employeeId)}
              >
                <span>{row.name}</span>
                <BandBadge position={row.position} />
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent salary changes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes in the last 90 days.</p>
          ) : (
            recent.slice(0, 5).map((h) => (
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
                <span className="tabular-nums">{formatMoney(h.newAmount, currency)}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Average by role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.avgByRole.slice(0, 6).map((r) => (
            <div key={r.role} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {r.role} · {r.headcount}
              </span>
              <span className="tabular-nums font-medium">
                {formatMoney(r.average, currency)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pay structures in use</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {employees.map((e) => {
            const rec = store.record(e.id);
            return rec ? (
              <span
                key={e.id}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
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
    return <p className="text-sm text-muted-foreground">No cost data.</p>;
  }
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span>{item.label}</span>
            <span className="tabular-nums font-medium">
              {formatMoney(item.amount, currency, { compact: true })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((item.amount / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
