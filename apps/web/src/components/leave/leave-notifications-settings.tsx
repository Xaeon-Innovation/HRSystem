"use client";

import { Switch } from "@/components/ui/switch";
import type { LeaveNotificationSetting } from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveNotificationsSettings({
  settings,
  onChange,
}: {
  settings: LeaveNotificationSetting[];
  onChange: (
    event: LeaveNotificationSetting["event"],
    patch: Partial<LeaveNotificationSetting>,
  ) => void;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink">{t("Notifications & reminders")}</h2>
        <p className="text-xs text-ink-muted">
          {t(
            "Structure for submit, decide, remind, escalate, cancel, and balance updates. Delivery can plug into the existing alerts service later.",
          )}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">{t("Event")}</th>
              <th className="px-3 py-2.5 text-center font-medium">{t("Employee")}</th>
              <th className="px-3 py-2.5 text-center font-medium">{t("Manager")}</th>
              <th className="px-3 py-2.5 text-center font-medium">{t("Admin")}</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((s) => (
              <tr key={s.event} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{s.label}</p>
                  <p className="text-xs text-ink-muted">{s.description}</p>
                </td>
                {(["employee", "manager", "admin"] as const).map((role) => (
                  <td key={role} className="px-3 py-3 text-center">
                    <div className="inline-flex justify-center">
                      <Switch
                        checked={s[role]}
                        aria-label={`${s.label} ${role}`}
                        onCheckedChange={(next) => onChange(s.event, { [role]: next })}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
