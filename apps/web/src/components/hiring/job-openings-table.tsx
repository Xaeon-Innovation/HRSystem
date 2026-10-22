"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PersonCell, StatusChip } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import {
  employmentTypeLabel,
  formatDate,
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

  const candidateCount = (j: JobOpening) =>
    Math.max(0, j.openingsCount - j.filledCount) + j.filledCount;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
          <Input
            className="h-9 w-full pl-8"
            placeholder={t("Search jobs")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={`${SELECT_CLASS} w-full sm:w-auto`}
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
          className={`${SELECT_CLASS} w-full sm:w-auto`}
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
        {canManage ? (
          <Button size="sm" className="w-full sm:ms-auto sm:w-auto" onClick={onNew}>
            {t("New job")}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <HiringEmptyState
          title={t("No job openings match")}
          description={t("Create a requisition to start a pipeline, or clear the filters.")}
          action={
            canManage ? (
              <Button size="sm" onClick={onNew}>
                {t("New job opening")}
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2.5 font-medium">{t("Role")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Hiring manager")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Recruiter")}</th>
                  <th className="px-3 py-2.5 text-end font-medium">{t("Candidates")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2/80"
                  >
                    <td className="px-3 py-3">
                      <button type="button" className="text-left" onClick={() => onOpen(job.id)}>
                        <p className="font-semibold text-ink">{job.title}</p>
                        <p className="text-xs text-ink-muted">
                          {job.branchName || job.location} · {employmentTypeLabel(job.employmentType)}
                          {" · "}
                          {t("opened")} {formatDate(job.openedAt)}
                        </p>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <PersonCell
                        name={job.hiringManagerName}
                        avatar={<UserAvatar name={job.hiringManagerName} size="sm" />}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <PersonCell
                        name={job.recruiterOwnerName}
                        avatar={<UserAvatar name={job.recruiterOwnerName} size="sm" />}
                      />
                    </td>
                    <td className="px-3 py-3 text-end tabular-nums text-ink">
                      {candidateCount(job)}
                    </td>
                    <td className="px-3 py-3">
                      <StatusChip status={job.status} label={jobStatusLabel(job.status)} />
                    </td>
                    <td className="px-3 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => onOpen(job.id)}>
                          {t("Edit")}
                        </Button>
                        {canManage ? (
                          <Button size="sm" variant="ghost" onClick={() => onRemove(job.id)}>
                            {t("Remove")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
