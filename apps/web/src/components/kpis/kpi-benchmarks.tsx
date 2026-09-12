import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/kpis/format";
import type { BenchmarkSet } from "@/lib/kpis/types";
import { t } from "@/i18n";

export function KpiBenchmarks({
  overall,
  benchmarks,
}: {
  overall: number | null;
  benchmarks: BenchmarkSet;
}) {
  const rows = [
    { label: t("This period"), value: overall },
    { label: t("Previous period"), value: benchmarks.previousPeriod },
    { label: t("Team average"), value: benchmarks.teamAverage },
    { label: t("Department average"), value: benchmarks.departmentAverage },
    { label: t("Company average"), value: benchmarks.companyAverage },
    { label: t("Role average"), value: benchmarks.roleAverage },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Benchmarks & context")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("Isolated scores are weaker than comparisons across time and peers")}</p>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-secondary/50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatNumber(row.value, 1)}
            </p>
            {overall != null && row.value != null && row.label !== t("This period") ? (
              <p className="text-[11px] text-muted-foreground">
                {overall - row.value >= 0 ? "+" : ""}
                {(overall - row.value).toFixed(1)} {t("vs this period")}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
