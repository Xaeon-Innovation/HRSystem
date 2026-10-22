"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeStatusBadge } from "@/components/compensation/compensation-status-badge";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import {
  changeTypeLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  TEXTAREA_CLASS,
} from "@/lib/compensation/format";
import { changeDelta } from "@/lib/compensation/calc";
import type { ChangeRequest, CompActor } from "@/lib/compensation/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function CompensationApprovalsPanel({
  requests,
  isAdmin,
  onOpenEmployee,
  onApprove,
  onReject,
  onReturn,
  onSelect,
}: {
  requests: ChangeRequest[];
  isAdmin: boolean;
  onOpenEmployee: (id: string) => void;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  onReturn: (id: string, note: string) => void;
  onSelect: (id: string) => void;
}) {
  const pending = requests.filter((r) => r.status === "pending");
  const others = requests.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      <Card className="border-line bg-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Awaiting decision")}</CardTitle>
          <p className="text-xs text-ink-muted">
            {t("Approve, reject, or return with a documented reason. Approved changes become date-effective on the compensation record.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <CompEmptyState
              title={t("Inbox is clear")}
              description={t("No salary change requests are waiting on HR.")}
            />
          ) : (
            pending.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isAdmin={isAdmin}
                onOpenEmployee={onOpenEmployee}
                onApprove={onApprove}
                onReject={onReject}
                onReturn={onReturn}
                onSelect={onSelect}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-line bg-surface">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-ink">{t("Recent decisions")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {others.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-ink-muted">{t("No decided requests yet.")}</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-y border-line bg-surface-2 text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("Employee")}</th>
                  <th className="px-3 py-2 font-medium">{t("Type")}</th>
                  <th className="px-3 py-2 font-medium">{t("Amount")}</th>
                  <th className="px-3 py-2 font-medium">{t("Status")}</th>
                  <th className="px-4 py-2 font-medium">{t("Decided")}</th>
                </tr>
              </thead>
              <tbody>
                {others.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60"
                    onClick={() => onSelect(r.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{r.employeeName}</p>
                      <p className="text-xs text-ink-muted">{r.reason}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">{changeTypeLabel(r.changeType)}</td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatMoney(r.previousAmount, r.currency)} →{" "}
                      {formatMoney(r.newAmount, r.currency)}
                    </td>
                    <td className="px-3 py-3">
                      <ChangeStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.decidedByName ?? "-"}
                      <p className="text-ink-muted">{formatDateTime(r.decidedAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestCard({
  request,
  isAdmin,
  onOpenEmployee,
  onApprove,
  onReject,
  onReturn,
  onSelect,
}: {
  request: ChangeRequest;
  isAdmin: boolean;
  onOpenEmployee: (id: string) => void;
  onApprove: (id: string, note: string) => void;
  onReject: (id: string, note: string) => void;
  onReturn: (id: string, note: string) => void;
  onSelect: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const delta = changeDelta(request.previousAmount, request.newAmount);

  return (
    <div className="rounded-sm border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            className="text-left font-semibold text-ink hover:underline"
            onClick={() => onOpenEmployee(request.employeeId)}
          >
            {request.employeeName}
          </button>
          <p className="text-xs text-ink-muted">
            {request.department} · {request.branchName} · {changeTypeLabel(request.changeType)}
          </p>
        </div>
        <ChangeStatusBadge status={request.status} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Fact label={t("Previous")} value={formatMoney(request.previousAmount, request.currency)} />
        <Fact label={t("Proposed")} value={formatMoney(request.newAmount, request.currency)} />
        <Fact
          label={t("Change")}
          value={`${formatMoney(delta.changeAmount, request.currency)} ${formatPercent(delta.changePercent)}`}
          tone={delta.changeAmount >= 0 ? "up" : "down"}
        />
        <Fact label={t("Effective")} value={formatDate(request.effectiveDate)} />
      </dl>
      <p className="mt-3 text-sm text-ink">{request.reason}</p>
      {request.justification ? (
        <p className="mt-1 text-sm text-ink-muted">{request.justification}</p>
      ) : null}
      {request.reviewCycleName || request.kpiScore != null ? (
        <p className="mt-2 text-xs text-ink-muted">
          {request.reviewCycleName ?? t("No review cycle")}
          {request.kpiScore != null ? ` · KPI ${request.kpiScore}` : ""}
        </p>
      ) : null}
      {isAdmin ? (
        <div className="mt-3 space-y-2">
          <textarea
            className={TEXTAREA_CLASS}
            placeholder={t("Decision note (required to reject or return)")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => onApprove(request.id, note || t("Approved"))}
            >
              {t("Approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => onReturn(request.id, note)}
            >
              {t("Return")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => onReject(request.id, note)}
            >
              {t("Reject")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onSelect(request.id)}
            >
              {t("Details")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="mt-3 w-full sm:w-auto"
          onClick={() => onSelect(request.id)}
        >
          {t("View")}
        </Button>
      )}
    </div>
  );
}

function Fact({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div>
      <dt className="text-[11px] text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "tabular-nums font-medium text-ink",
          tone === "up" && "text-accent-strong",
          tone === "down" && "text-danger",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
