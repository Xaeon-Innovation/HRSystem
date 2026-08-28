"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { SELECT_CLASS, formatKpiValue, formatPercent } from "@/lib/kpis/format";
import { KPI_STATUSES, type KpiStatus, type ScoredKpi } from "@/lib/kpis/types";

export function KpiTable({
  items,
  search,
  onSearch,
  status,
  onStatus,
  onOpen,
  showEmployee,
}: {
  items: ScoredKpi[];
  search: string;
  onSearch: (q: string) => void;
  status: KpiStatus | "";
  onStatus: (s: KpiStatus | "") => void;
  onOpen: (id: string) => void;
  showEmployee: boolean;
}) {
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const copy = q
      ? items.filter((k) =>
          `${k.title} ${k.employeeName ?? ""}`.toLowerCase().includes(q),
        )
      : [...items];
    copy.sort((a, b) => {
      const av = a.achievementPercent ?? -1;
      const bv = b.achievementPercent ?? -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [items, sortDir, search]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">All metrics</CardTitle>
            <p className="text-xs text-muted-foreground">Goal, result, and % of goal</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 pl-8"
                placeholder="Search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <select
              className={`${SELECT_CLASS} w-40`}
              value={status}
              onChange={(e) => onStatus(e.target.value as KpiStatus | "")}
            >
              <option value="">Any status</option>
              {KPI_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-2">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-y bg-secondary/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">Metric</th>
              {showEmployee ? <th className="px-3 py-2">Person</th> : null}
              <th className="px-3 py-2">Goal</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  % of goal
                </button>
              </th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="border-b hover:bg-secondary/40">
                <td className="px-3 py-2 font-medium">
                  <button type="button" className="text-left hover:underline" onClick={() => onOpen(k.id)}>
                    {k.title}
                  </button>
                </td>
                {showEmployee ? (
                  <td className="px-3 py-2 text-muted-foreground">{k.employeeName ?? "—"}</td>
                ) : null}
                <td className="px-3 py-2 tabular-nums">{formatKpiValue(k.targetValue, k.unit)}</td>
                <td className="px-3 py-2 tabular-nums">{formatKpiValue(k.actualValue, k.unit)}</td>
                <td className="px-3 py-2 tabular-nums">{formatPercent(k.achievementPercent, 0)}</td>
                <td className="px-3 py-2">
                  <KpiStatusBadge status={k.status} />
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" onClick={() => onOpen(k.id)}>
                    Open
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={showEmployee ? 7 : 6}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Nothing matches this search.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
