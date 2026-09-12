"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { JobStatusBadge, PriorityBadge } from "@/components/hiring/hiring-status-badge";
import {
  employmentTypeLabel,
  formatDate,
  formatMoney,
  jobStatusLabel,
  SELECT_CLASS,
} from "@/lib/hiring/format";
import { JOB_STATUSES, type JobOpening, type JobStatus } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function JobOpeningsTable({
  jobs,
  departments,
  canManage,
  onOpen,
  onNew,
  onRemove,
}: {
  jobs: JobOpening[];
  departments: string[];
  canManage: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobStatus | "">("");
  const [dept, setDept] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (status && j.status !== status) return false;
      if (dept && j.department !== dept) return false;
      if (!q) return true;
      return [j.title, j.department, j.hiringManagerName, j.location]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [jobs, search, status, dept]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("Search title, department, manager…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as JobStatus | "")}
        >
          <option value="">{t("All statuses")}</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {jobStatusLabel(s)}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="">{t("All departments")}</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <HiringEmptyState
          title={t("No job openings match")}
          description={t("Create a requisition to start a pipeline, or clear the filters.")}
          action={
            canManage ? (
              <Button size="sm" onClick={onNew}>
                {t("New job opening")}</Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <Card key={job.id} className="overflow-hidden">
              <CardContent className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button type="button" className="min-w-0 text-left" onClick={() => onOpen(job.id)}>
                    <p className="font-semibold">{job.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {job.department} · {job.branchName} · {employmentTypeLabel(job.employmentType)} ·{" "}
                      {job.hiringManagerName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.filledCount}/{job.openingsCount} {t("filled · opened")}{formatDate(job.openedAt)} {t("· target")}{formatDate(job.targetHireDate)} ·{" "}
                      {formatMoney(job.salaryRangeMin, job.currency)}–
                      {formatMoney(job.salaryRangeMax, job.currency)}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={job.priority} />
                    <JobStatusBadge status={job.status} />
                    <Button size="sm" variant="outline" onClick={() => onOpen(job.id)}>
                      {t("Open")}</Button>
                    {canManage ? (
                      <Button size="sm" variant="ghost" onClick={() => onRemove(job.id)}>
                        {t("Remove")}</Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
