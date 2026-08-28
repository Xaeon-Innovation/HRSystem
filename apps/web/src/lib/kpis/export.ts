import { formatKpiValue, formatPercent, statusLabel } from "./format";
import { CATEGORY_LABELS } from "./scoring";
import type { ScoredKpi } from "./types";

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function kpisToCsv(rows: ScoredKpi[]): string {
  const headers = [
    "KPI",
    "Employee",
    "Category",
    "Target",
    "Actual",
    "Achievement %",
    "Weight",
    "Weighted contribution",
    "Threshold",
    "Status",
    "Source",
    "Owner",
    "Last updated",
  ];
  const lines = [
    headers.join(","),
    ...rows.map((k) =>
      [
        k.title,
        k.employeeName ?? "",
        CATEGORY_LABELS[k.category],
        formatKpiValue(k.targetValue, k.unit),
        formatKpiValue(k.actualValue, k.unit),
        formatPercent(k.achievementPercent, 1),
        String(k.weight),
        formatPercent(k.weightedContribution, 1),
        `${k.threshold.minAcceptablePercent}%`,
        statusLabel(k.status),
        k.source,
        k.owner,
        k.lastUpdated ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
