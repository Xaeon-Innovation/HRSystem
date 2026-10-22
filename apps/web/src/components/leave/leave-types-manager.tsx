"use client";

import { Chip } from "@/components/elevora";
import { Switch } from "@/components/ui/switch";
import type { LeaveType } from "@/lib/leave/types";
import { t } from "@/i18n";

const COLUMNS: Array<{
  key: keyof LeaveType;
  label: string;
}> = [
  { key: "tracksBalance", label: "Track balance" },
  { key: "approvalRequired", label: "Approval" },
  { key: "attachmentRequired", label: "Attachment" },
  { key: "paid", label: "Paid" },
  { key: "allowHalfDay", label: "Half days" },
  { key: "allowEmergency", label: "Emergency" },
];

export function LeaveTypesManager({
  types,
  onChange,
}: {
  types: LeaveType[];
  onChange: (id: string, patch: Partial<LeaveType>) => void;
}) {
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-ink">{t("Leave types")}</h2>
        <p className="text-xs text-ink-muted">
          {t("Each type has its own balance, approval, and attachment rules.")}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
              <th className="px-3 py-2.5 font-medium">{t("Leave type")}</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-center font-medium">
                  {t(c.label)}
                </th>
              ))}
              <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
            </tr>
          </thead>
          <tbody>
            {types.map((lt) => (
              <tr
                key={lt.id}
                className="border-b border-line last:border-0 hover:bg-surface-2/80"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: lt.color }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{lt.name}</p>
                      <p className="truncate text-xs text-ink-muted">{lt.description}</p>
                    </div>
                  </div>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-3 text-center">
                    <div className="inline-flex justify-center">
                      <Switch
                        checked={Boolean(lt[c.key])}
                        aria-label={`${lt.name} ${c.label}`}
                        onCheckedChange={(next) =>
                          onChange(lt.id, { [c.key]: next } as Partial<LeaveType>)
                        }
                      />
                    </div>
                  </td>
                ))}
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onChange(lt.id, { enabled: !lt.enabled })}
                    className="inline-flex"
                  >
                    <Chip tone={lt.enabled ? "ok" : "neutral"}>
                      {lt.enabled ? t("On") : t("Off")}
                    </Chip>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
