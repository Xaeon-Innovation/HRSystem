import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatHours, formatMoney } from "@/lib/compensation/format";
import { cn } from "@/lib/utils";
import type { PayslipBreakdown } from "@/lib/compensation/types";

export function CompensationPayslipPreview({
  breakdown,
  compact = false,
}: {
  breakdown: PayslipBreakdown;
  compact?: boolean;
}) {
  const rows = [
    { label: "Gross pay", value: breakdown.gross, emphasize: true },
    { label: "Base pay", value: breakdown.base },
    { label: "Allowances", value: breakdown.allowances },
    { label: "Incentives", value: breakdown.incentives },
    { label: "Overtime", value: breakdown.overtime },
    { label: "Deductions", value: -breakdown.deductions },
    { label: "Net payable", value: breakdown.net, emphasize: true },
  ];

  return (
    <Card className={cn(!compact && "border-primary/15 bg-gradient-to-br from-white to-accent/20")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Payslip-ready breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">
          {breakdown.hourlyRate != null
            ? `Hourly: ${formatHours(breakdown.workedHours)} clocked · ${formatHours(breakdown.regularHours)} regular · ${formatHours(breakdown.overtimeHours)} OT at 1.5×. Tax/insurance are placeholders.`
            : "Structured for a future payroll engine. Tax and insurance are placeholders, not statutory calculations."}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rows.map((r) => (
            <div
              key={r.label}
              className={cn(
                "rounded-lg px-3 py-2",
                r.emphasize ? "bg-white/80 ring-1 ring-primary/15" : "bg-secondary/60",
              )}
            >
              <dt className="text-[11px] text-muted-foreground">{r.label}</dt>
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
          <ul className="divide-y rounded-lg border bg-white/70 text-sm">
            {breakdown.lines.map((line, i) => (
              <li key={`${line.kind}-${i}`} className="flex items-center justify-between px-3 py-2">
                <span className="text-muted-foreground">{line.label}</span>
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
