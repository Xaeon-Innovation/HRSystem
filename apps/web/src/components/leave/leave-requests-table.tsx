"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveEmptyState } from "@/components/leave/leave-states";
import {
  formatDate,
  formatDateTime,
  formatDays,
  SELECT_CLASS,
  statusLabel,
} from "@/lib/leave/format";
import { LEAVE_REQUEST_STATUSES, type LeaveActor, type LeaveEmployee, type LeaveRequest, type LeaveRequestFilters, type LeaveRequestStatus, type LeaveType } from "@/lib/leave/types";
import { actorCanActOnStep, currentApprovalStep } from "@/lib/leave/workflow";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function LeaveRequestsTable({
  requests,
  filters,
  onChange,
  employees,
  types,
  isAdmin,
  actor,
  onOpen,
  onQuickApprove,
  onQuickReject,
  selectedIds,
  onToggleSelect,
}: {
  requests: LeaveRequest[];
  filters: LeaveRequestFilters;
  onChange: (patch: Partial<LeaveRequestFilters>) => void;
  employees: LeaveEmployee[];
  types: LeaveType[];
  isAdmin: boolean;
  actor?: LeaveActor;
  onOpen: (id: string) => void;
  onQuickApprove?: (id: string) => void;
  onQuickReject?: (id: string) => void;
  selectedIds: string[];
  onToggleSelect: (id: string, selected: boolean) => void;
}) {
  const [more, setMore] = useState(false);
  const departments = [...new Set(employees.map((e) => e.department))].sort();
  const branches = [...new Map(employees.map((e) => [e.branchId, e.branchName])).entries()];
  const managers = employees.filter((e) => employees.some((x) => x.managerId === e.id));
  const pendingIds = requests.filter((r) => r.status === "pending").map((r) => r.id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("Leave requests")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("Status, dates, and who needs a decision")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 pl-8"
                placeholder={t("Search")}
                value={filters.search}
                onChange={(e) => onChange({ search: e.target.value })}
              />
            </div>
            <select
              className={cn(SELECT_CLASS, "w-44")}
              value={filters.status}
              onChange={(e) => onChange({ status: e.target.value as LeaveRequestStatus | "" })}
            >
              <option value="">{t("Any status")}</option>
              {LEAVE_REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMore((v) => !v)}>
              {more ? t("Fewer filters") : t("More filters")}
            </Button>
          </div>
        </div>
        {more ? (
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <FilterField label={t("Type")}>
              <select
                className={SELECT_CLASS}
                value={filters.leaveTypeId}
                onChange={(e) => onChange({ leaveTypeId: e.target.value })}
              >
                <option value="">{t("All types")}</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FilterField>
            {isAdmin ? (
              <FilterField label={t("Employee")}>
                <select
                  className={SELECT_CLASS}
                  value={filters.employeeId}
                  onChange={(e) => onChange({ employeeId: e.target.value })}
                >
                  <option value="">{t("Everyone")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : null}
            <FilterField label={t("Department")}>
              <select
                className={SELECT_CLASS}
                value={filters.department}
                onChange={(e) => onChange({ department: e.target.value })}
              >
                <option value="">{t("All departments")}</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </FilterField>
            <FilterField label={t("Branch")}>
              <select
                className={SELECT_CLASS}
                value={filters.branchId}
                onChange={(e) => onChange({ branchId: e.target.value })}
              >
                <option value="">{t("All branches")}</option>
                {branches.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </FilterField>
            {isAdmin ? (
              <FilterField label={t("Manager")}>
                <select
                  className={SELECT_CLASS}
                  value={filters.managerId}
                  onChange={(e) => onChange({ managerId: e.target.value })}
                >
                  <option value="">{t("Any manager")}</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </FilterField>
            ) : null}
            <FilterField label={t("From")}>
              <Input type="date" className="h-9" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
            </FilterField>
            <FilterField label={t("To")}>
              <Input type="date" className="h-9" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
            </FilterField>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-2">
        {requests.length === 0 ? (
          <div className="px-4 pb-4">
            <LeaveEmptyState
              title={t("No requests match")}
              description={t("Try another status, or file a new leave request.")}
            />
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-y bg-secondary/50 text-left text-xs text-muted-foreground">
                {isAdmin ? (
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={t("Select pending")}
                      checked={allPendingSelected}
                      onChange={(e) => {
                        pendingIds.forEach((id) => onToggleSelect(id, e.target.checked));
                      }}
                    />
                  </th>
                ) : null}
                <th className="px-3 py-2">{t("Person")}</th>
                <th className="px-3 py-2">{t("Type")}</th>
                <th className="px-3 py-2">{t("Dates")}</th>
                <th className="px-3 py-2">{t("Days")}</th>
                <th className="px-3 py-2">{t("Submitted")}</th>
                <th className="px-3 py-2">{t("Status")}</th>
                <th className="px-3 py-2">{t("Approver")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/30">
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      {r.status === "pending" ? (
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.employeeName}`}
                          checked={selectedIds.includes(r.id)}
                          onChange={(e) => onToggleSelect(r.id, e.target.checked)}
                        />
                      ) : null}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <button type="button" className="text-left" onClick={() => onOpen(r.id)}>
                      <p className="font-medium">{r.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.department} · {r.branchName}
                      </p>
                    </button>
                  </td>
                  <td className="px-3 py-2">{r.leaveTypeName}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatDate(r.startDate)}
                    {r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ""}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(r.requestedDays)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateTime(r.submittedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <LeaveStatusBadge status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.approverName ?? r.approvalSteps.find((s) => s.status === "pending")?.assigneeName ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "pending" &&
                      onQuickApprove &&
                      (isAdmin ||
                        (actor &&
                          actorCanActOnStep(actor, currentApprovalStep(r)))) ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => onQuickApprove(r.id)}>
                            {t("Approve")}</Button>
                          <Button size="sm" variant="ghost" onClick={() => onQuickReject?.(r.id)}>
                            {t("Reject")}</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => onOpen(r.id)}>
                          {t("View")}</Button>
                      )}
                    </div>
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

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
