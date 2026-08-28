import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import {
  changeTypeLabel,
  formatDate,
  formatMoney,
  formatPercent,
} from "@/lib/compensation/format";
import type { CompEmployee, SalaryHistoryEntry } from "@/lib/compensation/types";
import { cn } from "@/lib/utils";

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Salary history</CardTitle>
        <p className="text-xs text-muted-foreground">
          Starting pay and every approved change, with reason, review cycle, and approver
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-0">
        {history.length === 0 ? (
          <div className="px-4 pb-4">
            <CompEmptyState
              title="No salary history yet"
              description="Approved change requests will land here with previous and new amounts."
            />
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-y bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Previous</th>
                <th className="px-3 py-2 font-medium">New</th>
                <th className="px-3 py-2 font-medium">Change</th>
                <th className="px-3 py-2 font-medium">Effective</th>
                <th className="px-4 py-2 font-medium">Approved by</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr
                  key={h.id}
                  className="cursor-pointer border-b last:border-0 hover:bg-accent/30"
                  onClick={() => onOpenEmployee(h.employeeId)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{nameOf(h.employeeId)}</p>
                    <p className="text-xs text-muted-foreground">{h.reason}</p>
                  </td>
                  <td className="px-3 py-3 text-xs">{changeTypeLabel(h.changeType)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatMoney(h.previousAmount)}</td>
                  <td className="px-3 py-3 tabular-nums font-medium">
                    {formatMoney(h.newAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "tabular-nums text-xs font-medium",
                        h.changeAmount > 0 && "text-emerald-700",
                        h.changeAmount < 0 && "text-rose-700",
                      )}
                    >
                      {formatMoney(h.changeAmount)} {formatPercent(h.changePercent)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs">{formatDate(h.effectiveDate)}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>{h.approvedByName ?? "—"}</p>
                    <p className="text-muted-foreground">
                      {h.reviewCycleName ?? "No review cycle"}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
