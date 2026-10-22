import { Card, CardContent, CardHeader, CardTitle, overviewCardClass } from "@/components/ui/card";
import { formatHours, formatMoney } from "@/lib/compensation/format";
import { cn } from "@/lib/utils";
import type { PayslipBreakdown } from "@/lib/compensation/types";
import { t } from "@/i18n";

export function CompensationPayslipPreview({
  breakdown,
  compact = false,
}: {
  breakdown: PayslipBreakdown;
  compact?: boolean;
}) {
  const rows = [
    { label: t("Gross pay"), value: breakdown.gross, emphasize: true },
    { label: t("Base pay"), value: breakdown.base },
    { label: t("Allowances"), value: breakdown.allowances },
    { label: t("Incentives"), value: breakdown.incentives },
    { label: t("Overtime"), value: breakdown.overtime },
    { label: t("Deductions"), value: -breakdown.deductions },
    { label: t("Net payable"), value: breakdown.net, emphasize: true },
  ];

  return (
    <Card className={cn(!compact && overviewCardClass, !compact && "border-primary/15")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Payslip-ready breakdown")}</CardTitle>
        <p className="text-xs text-ink-muted">
          {breakdown.hourlyRate != null
            ? `Hourly: ${formatHours(breakdown.workedHours)} clocked · ${formatHours(breakdown.regularHours)} regular · ${formatHours(breakdown.overtimeHours)} OT at 1.5×. Tax/insurance are placeholders.`
            : t("Structured for a future payroll engine. Tax and insurance are placeholders, not statutory calculations.")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className={cn(
                "rounded-lg px-3 py-2",
                r.emphasize ? "bg-surface ring-1 ring-primary/15" : "bg-surface-2",
              )}
            >
              <dt className="text-[11px] text-ink-muted">{r.label}</dt>
              <dd
                className={cn(
                  "mt-0.5 text-sm font-semibold tabular-nums",
                  r.value < 0 && "text-rose-700",
                  r.emphasize && "text-base",
                )}
              >
                {formatMoney(r.value, breakdown.currency)}
              </dd>
            </div>
          ))}
        </dl>
        {!compact ? (
          <ul className="divide-y rounded-lg border bg-surface text-sm">
            {breakdown.lines.map((line, i) => (
              <li key={`${line.kind}-${i}`} className="flex items-center justify-between px-3 py-2">
                <span className="text-ink-muted">{line.label}</span>
                <span
                  className={cn(
                    "tabular-nums font-medium",
                    line.side === "deduction" && "text-rose-700",
                  )}
                >
                  {line.side === "deduction" ? "−" : ""}
                  {formatMoney(line.amount, breakdown.currency)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
