"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CompensationAuditTimeline } from "@/components/compensation/compensation-audit-timeline";
import { CompensationPayslipPreview } from "@/components/compensation/compensation-payslip-preview";
import {
  BandBadge,
  CompStatusBadge,
  VariableStatusBadge,
} from "@/components/compensation/compensation-status-badge";
import {
  appraisalLabel,
  changeTypeLabel,
  componentKindLabel,
  employmentTypeLabel,
  formatCompa,
  formatDate,
  formatHours,
  formatMoney,
  formatPercent,
  payFrequencyLabel,
  payStructureLabel,
  rateUnit,
} from "@/lib/compensation/format";
import { isDeduction } from "@/lib/compensation/calc";
import type { CompProfile } from "@/lib/compensation/types";
import type { CompensationStore } from "@/lib/compensation/store";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function CompensationProfileDrawer({
  profile,
  store,
  open,
  onOpenChange,
  canPropose,
  canEditRate,
  onPropose,
  onSetHourly,
}: {
  profile: CompProfile | null;
  store: CompensationStore;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canPropose: boolean;
  canEditRate?: boolean;
  onPropose: (employeeId: string) => void;
  onSetHourly?: (employeeId: string) => void;
}) {
  if (!profile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-w-2xl" />
      </Sheet>
    );
  }

  const { employee, record, band, payslip } = profile;
  const through = band.percentThroughBand;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl">
        <SheetHeader>
          <SheetTitle>{employee.name}</SheetTitle>
          <SheetDescription>
            {employee.employeeCode} · {employee.role} · {employee.department}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <CompStatusBadge status={record.status} />
            <BandBadge position={band.position} />
            {canPropose ? (
              <Button size="sm" className="ml-auto" onClick={() => onPropose(employee.id)}>
                {t("Propose change")}</Button>
            ) : null}
            {canEditRate && onSetHourly ? (
              <Button size="sm" variant="outline" onClick={() => onSetHourly(employee.id)}>
                {t("Set hourly rate")}</Button>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Fact label="Role / position" value={employee.role} />
            <Fact label="Department" value={employee.department} />
            <Fact label="Branch" value={employee.branchName} />
            <Fact label="Employment type" value={employmentTypeLabel(employee.employmentType)} />
            <Fact label="Salary type" value={payStructureLabel(record.payStructure)} />
            <Fact
              label="Base / rate"
              value={`${formatMoney(record.baseAmount, record.currency)}${rateUnit(record.payStructure)}`}
            />
            <Fact label="Currency" value={record.currency} />
            <Fact label="Pay frequency" value={payFrequencyLabel(record.payFrequency)} />
            <Fact label="Effective date" value={formatDate(record.effectiveDate)} />
            <Fact
              label="Total compensation"
              value={formatMoney(profile.totalCompensation, record.currency)}
            />
            <Fact
              label="Monthly equivalent"
              value={formatMoney(profile.monthlyEquivalent, record.currency)}
            />
            <Fact label="Manager" value={employee.managerName ?? "—"} />
          </dl>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">{t("Performance link")}</h4>
            <p className="text-sm text-muted-foreground">
              {t("Latest KPI")}{employee.latestKpiScore ?? "—"} {t("· Last appraisal")}{" "}
              {appraisalLabel(employee.lastAppraisalResult)}
              {employee.lastAppraisalDate ? ` (${formatDate(employee.lastAppraisalDate)})` : ""}
            </p>
          </section>

          {band.band ? (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">
                {t("Salary band")}{band.band.grade}
              </h4>
              <p className="text-xs text-muted-foreground">
                {t("Min")}{formatMoney(band.band.min, band.band.currency)} {t("· Mid")}{" "}
                {formatMoney(band.band.midpoint, band.band.currency)} {t("· Max")}{" "}
                {formatMoney(band.band.max, band.band.currency)} {t("· Compa-ratio")}{" "}
                {formatCompa(band.compaRatio)}
              </p>
              <div className="relative h-2 rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary/30"
                  style={{ width: "100%" }}
                />
                <div
                  className={cn(
                    "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ring-2 ring-white",
                    band.position === "in_band" && "bg-emerald-600",
                    band.position === "below" && "bg-amber-500",
                    band.position === "above" && "bg-rose-600",
                  )}
                  style={{
                    left: `${Math.min(Math.max(through ?? 50, -4), 104)}%`,
                  }}
                />
              </div>
            </section>
          ) : null}

          <CompensationPayslipPreview breakdown={payslip} compact />

          {record.payStructure === "hourly" || profile.hours ? (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">{t("Hours from clock in / out")}</h4>
              {profile.hours && profile.hours.shiftCount > 0 ? (
                <>
                  <dl className="grid grid-cols-3 gap-2 text-sm">
                    <Fact label={t("Worked")} value={formatHours(profile.hours.totalHours)} />
                    <Fact label={t("Regular")} value={formatHours(profile.hours.regularHours)} />
                    <Fact label={t("Overtime")} value={formatHours(profile.hours.overtimeHours)} />
                  </dl>
                  {profile.hours.openShiftCount > 0 ? (
                    <p className="text-xs text-amber-800">
                      {profile.hours.openShiftCount} {t("open shift")}{profile.hours.openShiftCount === 1 ? "" : "s"} {t("counted through now.")}</p>
                  ) : null}
                  <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
                    {profile.hours.shifts.slice(0, 14).map((s, i) => (
                      <li key={`${s.clockInAt}-${i}`} className="flex justify-between px-3 py-1.5">
                        <span className="text-muted-foreground">
                          {formatDate(s.clockInAt.slice(0, 10))}
                          {s.open ? t(" · open") : ""}
                        </span>
                        <span className="tabular-nums">{formatHours(s.hours)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("No clock records in this payroll cycle yet. Pay will stay at zero until they clock in and out.")}</p>
              )}
            </section>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">{t("Components")}</h4>
            {profile.components.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No extra line items.")}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {profile.components.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {c.label}
                      <span className="text-muted-foreground"> · {componentKindLabel(c.kind)}</span>
                    </span>
                    <span
                      className={cn(
                        "tabular-nums",
                        isDeduction(c.kind) && "text-rose-700",
                      )}
                    >
                      {c.amountType === "percent_of_base"
                        ? `${c.amount}%`
                        : formatMoney(c.amount, record.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">{t("Salary history")}</h4>
            {profile.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No history.")}</p>
            ) : (
              <ol className="space-y-2">
                {profile.history.map((h) => (
                  <li key={h.id} className="rounded-lg border bg-card px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{changeTypeLabel(h.changeType)}</span>
                      <span className="tabular-nums">{formatDate(h.effectiveDate)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(h.previousAmount, record.currency)} →{" "}
                      {formatMoney(h.newAmount, record.currency)}{" "}
                      <span
                        className={
                          h.changeAmount >= 0 ? "text-emerald-700" : "text-rose-700"
                        }
                      >
                        {formatPercent(h.changePercent)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.reason}
                      {h.reviewCycleName ? ` · ${h.reviewCycleName}` : ""} {t("· Submitted")}{" "}
                      {h.submittedByName}
                      {h.approvedByName ? ` · Approved ${h.approvedByName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">{t("Variable pay")}</h4>
            {profile.variable.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No bonuses or commissions on file.")}</p>
            ) : (
              <ul className="space-y-2">
                {profile.variable.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>
                      {v.kind === "bonus" ? t("Bonus") : t("Commission")} ·{" "}
                      {formatMoney(v.amount, v.currency)}
                      {v.kpiLinked ? ` · KPI ${v.kpiScore ?? "—"}` : ""}
                    </span>
                    <VariableStatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {record.notes ? (
            <section>
              <h4 className="text-sm font-semibold">{t("Notes")}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{record.notes}</p>
            </section>
          ) : null}

          <section className="space-y-2">
            <h4 className="text-sm font-semibold">{t("Audit trail")}</h4>
            <CompensationAuditTimeline events={store.audit(employee.id)} />
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
