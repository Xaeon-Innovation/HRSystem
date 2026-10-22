"use client";

import { useMemo, useState } from "react";
import { HatchBar, Segmented } from "@/components/elevora";
import { LeaveConflictWarnings } from "@/components/leave/leave-conflict-warnings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS, todayIso } from "@/lib/leave/format";

function fmtNum(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
import { hasBlockingConflicts } from "@/lib/leave/conflicts";
import type { LeaveStore } from "@/lib/leave/store";
import type {
  LeaveActor,
  LeaveBalance,
  LeaveRequestDraft,
  LeaveType,
  PartialDayType,
} from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveRequestRail({
  store,
  actor,
  isAdmin,
  annualBalance,
  annualType,
  busy,
  onSubmit,
  onOpenFullForm,
}: {
  store: LeaveStore;
  actor: LeaveActor;
  isAdmin: boolean;
  annualBalance?: LeaveBalance;
  annualType?: LeaveType;
  busy?: boolean;
  onSubmit: (draft: LeaveRequestDraft) => Promise<void>;
  onOpenFullForm: () => void;
}) {
  const types = store.types().filter((lt) => lt.enabled);
  const employees = store.employees();
  const defaultEmployeeId =
    actor.role === "employee"
      ? actor.employeeId ?? employees[0]?.id ?? ""
      : employees[0]?.id ?? "";

  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? "");
  const [partialDayType, setPartialDayType] = useState<PartialDayType>("full");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const employeeId = isAdmin
    ? defaultEmployeeId
    : actor.employeeId ?? defaultEmployeeId;

  const draft: LeaveRequestDraft = {
    employeeId,
    leaveTypeId,
    startDate,
    endDate: partialDayType === "full" ? endDate : startDate,
    requestedDays: null,
    partialDayType,
    customHours: partialDayType === "custom_hours" ? 4 : null,
    urgency: "planned",
    reason: "",
    handoverNotes: "",
    coverageEmployeeId: null,
    attachmentName: null,
    attachments: [],
    asDraft: false,
  };

  const preview = useMemo(
    () => (employeeId && leaveTypeId ? store.preview(draft) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [employeeId, leaveTypeId, startDate, endDate, partialDayType, store],
  );

  const pool =
    annualBalance != null
      ? annualBalance.used + annualBalance.pending + Math.max(0, annualBalance.remaining)
      : 0;
  const usedPct =
    pool > 0 && annualBalance
      ? Math.min(100, ((annualBalance.used + annualBalance.pending) / pool) * 100)
      : 0;

  async function submit() {
    if (!employeeId || !leaveTypeId) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...draft,
        requestedDays: preview?.days ?? null,
        endDate: partialDayType === "full" ? endDate : startDate,
      });
      setStartDate(todayIso());
      setEndDate(todayIso());
      setPartialDayType("full");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not submit."));
    } finally {
      setSaving(false);
    }
  }

  const blocked = preview ? hasBlockingConflicts(preview.conflicts) : true;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-sm border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">{t("New request")}</h3>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-ink-muted">{t("Type")}</Label>
            <select
              className={SELECT_CLASS}
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              {types.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-ink-muted">{t("Length")}</Label>
            <Segmented
              aria-label={t("Length")}
              className="flex w-full flex-wrap"
              value={partialDayType}
              onChange={(v) => {
                setPartialDayType(v);
                if (v !== "full") setEndDate(startDate);
              }}
              options={[
                { value: "full", label: t("Full") },
                { value: "first_half", label: t("1st half") },
                { value: "second_half", label: t("2nd half") },
                { value: "custom_hours", label: t("Hours") },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-ink-muted">{t("From")}</Label>
              <Input
                type="date"
                className="h-9"
                value={startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setStartDate(v);
                  if (partialDayType !== "full" || endDate < v) setEndDate(v);
                }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-ink-muted">{t("To")}</Label>
              <Input
                type="date"
                className="h-9"
                min={startDate}
                disabled={partialDayType !== "full"}
                value={partialDayType === "full" ? endDate : startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {preview && preview.conflicts.length > 0 ? (
            <div className="rounded-sm border border-warn/30 bg-warn/10 p-2">
              <LeaveConflictWarnings conflicts={preview.conflicts} />
            </div>
          ) : null}

          {error ? <p className="text-xs text-danger">{error}</p> : null}

          <Button
            className="w-full"
            disabled={busy || saving || blocked || !leaveTypeId}
            onClick={() => void submit()}
          >
            {t("Submit request")}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-ink-muted hover:text-ink hover:underline"
            onClick={onOpenFullForm}
          >
            {t("More options…")}
          </button>
        </div>
      </div>

      <div className="rounded-sm border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold text-ink">
          {annualType?.name ?? t("Annual")} {t("balance")}
        </h3>
        {annualType?.description ? (
          <p className="mt-0.5 text-xs text-ink-muted">{annualType.description}</p>
        ) : null}
        <div className="mt-3">
          {annualBalance ? (
            <>
              <p className="text-[26px] font-semibold tabular tracking-tight text-ink">
                {fmtNum(annualBalance.remaining)}
                <span className="ms-1 text-[15px] font-medium text-ink-muted">
                  {t("days left")}
                </span>
              </p>
              <HatchBar className="mt-2" size="sm" percent={100 - usedPct} tone="accent" />
              <div className="mt-1 flex items-center justify-between text-2xs text-ink-muted">
                <span>
                  {fmtNum(annualBalance.used)} {t("used")} · {fmtNum(annualBalance.pending)}{" "}
                  {t("pending")}
                </span>
                <span className="tabular">
                  {fmtNum(
                    annualBalance.used +
                      annualBalance.pending +
                      Math.max(0, annualBalance.remaining),
                  )}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">{t("No balance tracked for this type.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
