"use client";

import { useState } from "react";
import { AlertTriangle, Paperclip, Search } from "lucide-react";
import { Chip, PersonCell, PillSelect, Segmented, StatusChip } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LeaveEmptyState } from "@/components/leave/leave-states";
import {
  formatDate,
  formatDays,
  partialDayLabel,
  SELECT_CLASS,
  statusLabel,
  urgencyLabel,
} from "@/lib/leave/format";
import {
  LEAVE_REQUEST_STATUSES,
  type LeaveActor,
  type LeaveEmployee,
  type LeaveRequest,
  type LeaveRequestFilters,
  type LeaveRequestStatus,
  type LeaveType,
} from "@/lib/leave/types";
import { actorCanActOnStep, currentApprovalStep } from "@/lib/leave/workflow";
import { t } from "@/i18n";

type StatusSeg = "pending" | "approved" | "rejected" | "all";

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
  const allPendingSelected =
    pendingIds.length > 0 && pendingIds.every((id) => selectedIds.includes(id));

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const statusSeg: StatusSeg =
    filters.status === "pending" ||
    filters.status === "approved" ||
    filters.status === "rejected"
      ? filters.status
      : filters.status === ""
        ? "all"
        : "all";

  const typeLabel =
    types.find((lt) => lt.id === filters.leaveTypeId)?.name ?? t("All types");

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Segmented
          aria-label={t("Status")}
          className="w-full flex-wrap sm:w-auto"
          value={statusSeg}
          onChange={(v) =>
            onChange({
              status: (v === "all" ? "" : v) as LeaveRequestStatus | "",
            })
          }
          options={[
            {
              value: "pending",
              label: `${t("Pending")}${pendingCount ? ` · ${pendingCount}` : ""}`,
            },
            { value: "approved", label: t("Approved") },
            { value: "rejected", label: t("Rejected") },
            { value: "all", label: t("All") },
          ]}
        />
        <PillSelect label={typeLabel} className="w-full sm:w-auto">
          <select
            aria-label={t("Leave type")}
            className="absolute inset-0 cursor-pointer opacity-0"
            value={filters.leaveTypeId}
            onChange={(e) => onChange({ leaveTypeId: e.target.value })}
          >
            <option value="">{t("All types")}</option>
            {types.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>
        </PillSelect>
        <div className="relative min-w-0 flex-1 sm:max-w-[12rem]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
          <Input
            className="h-9 w-full pl-8"
            placeholder={t("Search")}
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setMore((v) => !v)}
        >
          {more ? t("Fewer filters") : t("More filters")}
        </Button>
      </div>

      {more ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
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
            <Input
              type="date"
              className="h-9"
              value={filters.from}
              onChange={(e) => onChange({ from: e.target.value })}
            />
          </FilterField>
          <FilterField label={t("To")}>
            <Input
              type="date"
              className="h-9"
              value={filters.to}
              onChange={(e) => onChange({ to: e.target.value })}
            />
          </FilterField>
          {!["pending", "approved", "rejected", ""].includes(filters.status) ? (
            <FilterField label={t("Other status")}>
              <select
                className={SELECT_CLASS}
                value={filters.status}
                onChange={(e) =>
                  onChange({ status: e.target.value as LeaveRequestStatus | "" })
                }
              >
                <option value="">{t("Any status")}</option>
                {LEAVE_REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </FilterField>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="px-4 pb-4">
              <LeaveEmptyState
                title={t("No requests match")}
                description={t("Try another status, or file a new leave request.")}
              />
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  {isAdmin ? (
                    <th className="px-3 py-2.5">
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
                  <th className="px-3 py-2.5 font-medium">{t("Employee")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Dates")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Length")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Kind")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const warnBits: string[] = [];
                  if (r.conflicts.some((c) => c.severity !== "info")) {
                    const msg = r.conflicts.find((c) => c.severity !== "info")?.message;
                    if (msg) warnBits.push(msg);
                  }
                  if (
                    r.attachments.length === 0 &&
                    !r.attachmentName &&
                    types.find((lt) => lt.id === r.leaveTypeId)?.attachmentRequired
                  ) {
                    warnBits.push(t("Attachment required"));
                  }
                  const canAct =
                    r.status === "pending" &&
                    onQuickApprove &&
                    (isAdmin ||
                      (actor && actorCanActOnStep(actor, currentApprovalStep(r))));

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-line last:border-0 hover:bg-surface-2/80"
                    >
                      {isAdmin ? (
                        <td className="px-3 py-3">
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
                      <td className="px-3 py-3">
                        <button type="button" className="text-left" onClick={() => onOpen(r.id)}>
                          <PersonCell name={r.employeeName} subtitle={r.leaveTypeName} />
                        </button>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-ink">
                        {formatDate(r.startDate)}
                        {r.startDate !== r.endDate ? ` – ${formatDate(r.endDate)}` : ""}
                      </td>
                      <td className="px-3 py-3 text-ink-muted">
                        {r.partialDayType !== "full" && r.startDate === r.endDate
                          ? partialDayLabel(r.partialDayType)
                          : formatDays(r.requestedDays)}
                      </td>
                      <td className="px-3 py-3">
                        <Chip tone={r.urgency === "emergency" ? "warn" : "neutral"}>
                          {urgencyLabel(r.urgency)}
                        </Chip>
                      </td>
                      <td className="px-3 py-3">
                        <StatusChip status={r.status} label={statusLabel(r.status)} />
                        {warnBits.length > 0 ? (
                          <div className="mt-1 flex items-start gap-1 text-[11px] text-warn">
                            {r.conflicts.some((c) => c.severity !== "info") ? (
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            ) : (
                              <Paperclip className="mt-0.5 h-3 w-3 shrink-0" />
                            )}
                            <span className="line-clamp-2">{warnBits[0]}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-end">
                        <div className="flex justify-end gap-1">
                          {canAct ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onQuickApprove?.(r.id)}
                              >
                                {t("Approve")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onQuickReject?.(r.id)}
                              >
                                {t("Reject")}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => onOpen(r.id)}>
                              {t("Review")}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-ink-muted">{label}</Label>
      {children}
    </div>
  );
}
