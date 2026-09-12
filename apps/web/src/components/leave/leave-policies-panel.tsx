"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveAccrualSettings } from "@/components/leave/leave-accrual-settings";
import { LeaveNotificationsSettings } from "@/components/leave/leave-notifications-settings";
import { LeaveTypesManager } from "@/components/leave/leave-types-manager";
import { SELECT_CLASS } from "@/lib/leave/format";
import type {
  LeaveNotificationSetting,
  LeavePolicy,
  LeaveType,
  WeekendRule,
} from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeavePoliciesPanel({
  types,
  policies,
  notifications,
  onTypeChange,
  onPolicyChange,
  onNotificationChange,
  onRunAccrual,
  lastPosted,
}: {
  types: LeaveType[];
  policies: LeavePolicy[];
  notifications: LeaveNotificationSetting[];
  onTypeChange: (id: string, patch: Partial<LeaveType>) => void;
  onPolicyChange: (id: string, patch: Partial<LeavePolicy>) => void;
  onNotificationChange: (
    event: LeaveNotificationSetting["event"],
    patch: Partial<LeaveNotificationSetting>,
  ) => void;
  onRunAccrual: () => void;
  lastPosted: string | null;
}) {
  return (
    <div className="space-y-4">
      <LeaveTypesManager types={types} onChange={onTypeChange} />
      <LeaveAccrualSettings
        policies={policies}
        types={types}
        onChange={onPolicyChange}
        onRunAccrual={onRunAccrual}
        lastPosted={lastPosted}
      />
      <PolicyRules policies={policies} types={types} onChange={onPolicyChange} />
      <LeaveNotificationsSettings settings={notifications} onChange={onNotificationChange} />
    </div>
  );
}

function PolicyRules({
  policies,
  types,
  onChange,
}: {
  policies: LeavePolicy[];
  types: LeaveType[];
  onChange: (id: string, patch: Partial<LeavePolicy>) => void;
}) {
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Policy rules")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("Notice, probation, weekends, holidays, staffing, and approval routing.")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {policies.map((p) => (
          <div key={p.id} className="rounded-xl border p-3">
            <p className="font-medium">{typeName(p.leaveTypeId)}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t("Min notice (days)")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.minNoticeDays}
                  onChange={(e) => onChange(p.id, { minNoticeDays: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Probation lockout (days)")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.probationLockoutDays}
                  onChange={(e) => onChange(p.id, { probationLockoutDays: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Team overlap limit")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.staffingLimit}
                  onChange={(e) => onChange(p.id, { staffingLimit: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Weekends")}>
                <select
                  className={SELECT_CLASS}
                  value={p.weekendRule}
                  onChange={(e) => onChange(p.id, { weekendRule: e.target.value as WeekendRule })}
                >
                  <option value="sat_sun">{t("Sat–Sun off")}</option>
                  <option value="fri_sat">{t("Fri–Sat off")}</option>
                  <option value="none">{t("Count weekends")}</option>
                </select>
              </Field>
              <Field label={t("Long-leave threshold")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.longLeaveDaysThreshold}
                  onChange={(e) => onChange(p.id, { longLeaveDaysThreshold: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Reminder (hours)")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.reminderHours}
                  onChange={(e) => onChange(p.id, { reminderHours: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Escalate after (hours)")}>
                <Input
                  type="number"
                  className="h-9"
                  value={p.escalationHours}
                  onChange={(e) => onChange(p.id, { escalationHours: Number(e.target.value) })}
                />
              </Field>
              <Field label={t("Backup approver")}>
                <Input
                  className="h-9"
                  value={p.backupApproverName ?? ""}
                  onChange={(e) => onChange(p.id, { backupApproverName: e.target.value })}
                />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Check
                label={t("Allow negative balance")}
                checked={p.negativeAllowed}
                onChange={(v) => onChange(p.id, { negativeAllowed: v })}
              />
              <Check
                label={t("Count public holidays")}
                checked={p.countHolidays}
                onChange={(v) => onChange(p.id, { countHolidays: v })}
              />
              <Check
                label={t("Manager approves first")}
                checked={p.managerFirst}
                onChange={(v) => onChange(p.id, { managerFirst: v })}
              />
              <Check
                label={t("Multi-level for long leave")}
                checked={p.multiLevelEnabled}
                onChange={(v) => onChange(p.id, { multiLevelEnabled: v })}
              />
              <Check
                label={t("Reserve pending days")}
                checked={p.reservePendingDays}
                onChange={(v) => onChange(p.id, { reservePendingDays: v })}
              />
              <Check
                label={t("Delegation / backup")}
                checked={p.delegationEnabled}
                onChange={(v) => onChange(p.id, { delegationEnabled: v })}
              />
            </div>
            {p.blackoutDates.length > 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("Blackout:")}{p.blackoutDates.map((b) => `${b.label} (${b.startDate}–${b.endDate})`).join(" · ")}
              </p>
            ) : null}
            {p.scope.department || p.scope.branchId || p.scope.role ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Scoped to")}{[p.scope.department, p.scope.branchId, p.scope.role].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
