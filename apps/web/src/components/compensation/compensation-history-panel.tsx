import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import { Timeline } from "@/components/elevora";
import {
  changeTypeLabel,
  formatDate,
  formatMoney,
  formatPercent,
} from "@/lib/compensation/format";
import type { CompEmployee, SalaryHistoryEntry } from "@/lib/compensation/types";
import { t } from "@/i18n";

export function CompensationHistoryPanel({
  history,
  employees,
  onOpenEmployee,
}: {
  history: SalaryHistoryEntry[];
  employees: CompEmployee[];
  onOpenEmployee: (id: string) => void;
}) {
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? id;
  const sorted = [...history].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate),
  );

  return (
    <Card className="border-line bg-surface">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-ink">{t("Salary history")}</CardTitle>
        <p className="text-xs text-ink-muted">
          {t("Starting pay and every approved change, with reason, review cycle, and approver")}
        </p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <CompEmptyState
            title={t("No salary history yet")}
            description={t("Approved change requests will land here with previous and new amounts.")}
          />
        ) : (
          <Timeline
            items={sorted.map((h) => ({
              id: h.id,
              tone: h.changeAmount < 0 ? "warn" : "accent",
              title: (
                <button
                  type="button"
                  className="text-left hover:underline"
                  onClick={() => onOpenEmployee(h.employeeId)}
                >
                  {nameOf(h.employeeId)} · {changeTypeLabel(h.changeType)}
                </button>
              ),
              meta: (
                <span>
                  {formatMoney(h.previousAmount)} → {formatMoney(h.newAmount)} (
                  {formatMoney(h.changeAmount)} {formatPercent(h.changePercent)}) ·{" "}
                  {formatDate(h.effectiveDate)}
                  {h.approvedByName ? ` · ${h.approvedByName}` : ""}
                  {h.reason ? ` · ${h.reason}` : ""}
                </span>
              ),
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
