"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

export type OrgSite = {
  id: string;
  name: string;
  code: string;
  branchId: string;
};

export type OrgBranch = {
  id: string;
  name: string;
  code: string;
  status: string;
  sites: OrgSite[];
};

export type OrgJobRole = {
  id: string;
  name: string;
  employeeCount?: number;
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

type OrgSetupPanelProps = {
  /** Compact stacked layout (settings page) vs side-by-side details (legacy). */
  layout?: "stacked" | "details";
  onChanged?: () => void;
};

export function OrgSetupPanel({
  layout = "stacked",
  onChanged,
}: OrgSetupPanelProps) {
  const [org, setOrg] = useState<OrgBranch[]>([]);
  const [jobRoles, setJobRoles] = useState<OrgJobRole[]>([]);
  const [jobRoleName, setJobRoleName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteBranchId, setSiteBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingJobRole, setPendingJobRole] = useState<OrgJobRole | null>(null);
  const [pendingBranch, setPendingBranch] = useState<OrgBranch | null>(null);
  const [jobRoleBusy, setJobRoleBusy] = useState(false);
  const [branchBusy, setBranchBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [branches, roles] = await Promise.all([
      api<{ branches: OrgBranch[] }>("/v1/branches"),
      api<{ jobRoles: OrgJobRole[] }>("/v1/job-roles"),
    ]);
    setOrg(branches.branches ?? []);
    setJobRoles(roles.jobRoles ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load org"),
      )
      .finally(() => setLoading(false));
  }, [load]);

  async function afterMutation() {
    await load();
    onChanged?.();
  }

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/branches", {
        method: "POST",
        body: JSON.stringify({ name: branchName, code: branchCode }),
      });
      setBranchName("");
      setBranchCode("");
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function removeBranch() {
    const branch = pendingBranch;
    if (!branch) return;
    setError(null);
    setBranchBusy(true);
    try {
      await api(`/v1/branches/${branch.id}`, { method: "DELETE" });
      if (siteBranchId === branch.id) setSiteBranchId("");
      setPendingBranch(null);
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove branch");
    } finally {
      setBranchBusy(false);
    }
  }

  async function createSite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/v1/sites", {
        method: "POST",
        body: JSON.stringify({
          branchId: siteBranchId,
          name: siteName,
          code: siteCode,
        }),
      });
      setSiteName("");
      setSiteCode("");
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function createJobRole(e: FormEvent) {
    e.preventDefault();
    const name = jobRoleName.trim();
    if (!name) return;
    setError(null);
    try {
      await api("/v1/job-roles", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setJobRoleName("");
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job role");
    }
  }

  async function removeJobRole() {
    const role = pendingJobRole;
    if (!role) return;
    setError(null);
    setJobRoleBusy(true);
    try {
      await api(`/v1/job-roles/${role.id}`, { method: "DELETE" });
      setPendingJobRole(null);
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove job role");
    } finally {
      setJobRoleBusy(false);
    }
  }

  const rolesBlock = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("Functions people perform (sales, driver, coordinator). Separate from Admin or Employee access.")}</p>
      <ul className="space-y-2 text-sm">
        {jobRoles.map((role) => (
          <li
            key={role.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <span className="font-medium">{role.name}</span>
              <span className="text-muted-foreground">
                {" "}
                · {role.employeeCount ?? 0} {t("assigned")}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPendingJobRole(role)}
            >
              {t("Remove")}</Button>
          </li>
        ))}
        {jobRoles.length === 0 ? (
          <li className="text-muted-foreground">{t("No job roles yet.")}</li>
        ) : null}
      </ul>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={createJobRole}
      >
        <Input
          placeholder={t("Role name (Sales, Driver…)")}
          value={jobRoleName}
          onChange={(e) => setJobRoleName(e.target.value)}
          required
        />
        <Button type="submit" className="w-full sm:w-auto">
          {t("Add")}</Button>
      </form>
    </div>
  );

  const branchesBlock = (
    <div className="space-y-4">
      <ul className="space-y-2 text-sm">
        {org.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <div>
              <span className="font-medium">{b.name}</span>{" "}
              <span className="text-muted-foreground">({b.code})</span>
              {b.sites.length ? (
                <span className="text-muted-foreground">
                  {" "}
                  — {b.sites.map((s) => s.name).join(", ")}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPendingBranch(b)}
            >
              {t("Remove")}</Button>
          </li>
        ))}
        {org.length === 0 ? (
          <li className="text-muted-foreground">{t("No branches yet.")}</li>
        ) : null}
      </ul>
      <form className="grid gap-2 sm:grid-cols-3" onSubmit={createBranch}>
        <Input
          placeholder={t("Branch name")}
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          required
        />
        <Input
          placeholder={t("Code (cairo)")}
          value={branchCode}
          onChange={(e) => setBranchCode(e.target.value)}
          required
        />
        <Button type="submit" className="w-full sm:w-auto">
          {t("Add branch")}</Button>
      </form>
      <form className="grid gap-2 sm:grid-cols-4" onSubmit={createSite}>
        <select
          className={selectClass}
          value={siteBranchId}
          onChange={(e) => setSiteBranchId(e.target.value)}
          required
        >
          <option value="">{t("Branch")}</option>
          {org.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Input
          placeholder={t("Site name")}
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          required
        />
        <Input
          placeholder={t("Code")}
          value={siteCode}
          onChange={(e) => setSiteCode(e.target.value)}
          required
        />
        <Button type="submit" variant="secondary" className="w-full sm:w-auto">
          {t("Add site")}</Button>
      </form>
    </div>
  );

  if (loading) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {layout === "details" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <details className="rounded-lg border bg-card" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {t("Job roles")}<span className="ml-2 font-normal text-muted-foreground">
                {jobRoles.length}
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">{rolesBlock}</div>
          </details>
          <details className="rounded-lg border bg-card" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {t("Branches & sites")}<span className="ml-2 font-normal text-muted-foreground">
                {org.length}
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">{branchesBlock}</div>
          </details>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">
              {t("Job roles")}{" "}
              <span className="font-normal text-muted-foreground">
                ({jobRoles.length})
              </span>
            </h2>
            {rolesBlock}
          </section>
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold">
              {t("Branches & sites")}{" "}
              <span className="font-normal text-muted-foreground">
                ({org.length})
              </span>
            </h2>
            {branchesBlock}
          </section>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingJobRole)}
        title={`Remove job role “${pendingJobRole?.name}”?`}
        description="Employees keep their profiles; this role is unassigned from everyone."
        confirmLabel="Remove"
        variant="destructive"
        busy={jobRoleBusy}
        onConfirm={() => void removeJobRole()}
        onOpenChange={(open) => {
          if (!open && !jobRoleBusy) setPendingJobRole(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingBranch)}
        title={`Remove branch “${pendingBranch?.name}”?`}
        description="Sites under this branch are removed. Employees assigned here become unassigned."
        confirmLabel="Remove"
        variant="destructive"
        busy={branchBusy}
        onConfirm={() => void removeBranch()}
        onOpenChange={(open) => {
          if (!open && !branchBusy) setPendingBranch(null);
        }}
      />
    </div>
  );
}
