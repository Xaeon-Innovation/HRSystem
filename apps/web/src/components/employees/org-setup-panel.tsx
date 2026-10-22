"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Trash2 } from "lucide-react";
import { SKILL_LEVELS, type SkillLevel } from "@hr/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Chip,
  IconTile,
  ListRow,
  Notice,
} from "@/components/elevora";
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
  description?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  employeeCount?: number;
};

type Criterion = {
  id: string;
  name: string;
  metric: string | null;
  targetValue: number | null;
  weight: number;
  sortOrder: number;
};

type CatalogSkill = { id: string; name: string };

type RoleSkill = {
  skillId: string;
  skillName: string;
  requiredLevel: SkillLevel;
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const LEVEL_LABEL: Record<SkillLevel, string> = {
  basic: "Basic",
  competent: "Competent",
  strong: "Strong",
};

type OrgSetupPanelProps = {
  /** Grid matches redesign prototype; stacked/details keep legacy shells. */
  layout?: "stacked" | "details" | "grid";
  onChanged?: () => void;
};

export function OrgSetupPanel({
  layout = "stacked",
  onChanged,
}: OrgSetupPanelProps) {
  const [org, setOrg] = useState<OrgBranch[]>([]);
  const [jobRoles, setJobRoles] = useState<OrgJobRole[]>([]);
  const [jobRoleName, setJobRoleName] = useState("");
  const [jobRoleDescription, setJobRoleDescription] = useState("");
  const [jobRoleResponsibilities, setJobRoleResponsibilities] = useState("");
  const [jobRoleRequirements, setJobRoleRequirements] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteBranchId, setSiteBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingJobRole, setPendingJobRole] = useState<OrgJobRole | null>(null);
  const [pendingBranch, setPendingBranch] = useState<OrgBranch | null>(null);
  const [pendingCriterion, setPendingCriterion] = useState<Criterion | null>(
    null,
  );
  const [pendingSkill, setPendingSkill] = useState<CatalogSkill | null>(null);
  const [jobRoleBusy, setJobRoleBusy] = useState(false);
  const [branchBusy, setBranchBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editResponsibilities, setEditResponsibilities] = useState("");
  const [editRequirements, setEditRequirements] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [criterionName, setCriterionName] = useState("");
  const [criterionMetric, setCriterionMetric] = useState("");
  const [criterionWeight, setCriterionWeight] = useState("1");
  const [criterionBusy, setCriterionBusy] = useState(false);

  const [catalogSkills, setCatalogSkills] = useState<CatalogSkill[]>([]);
  const [roleSkills, setRoleSkills] = useState<
    Record<string, SkillLevel>
  >({});
  const [newSkillName, setNewSkillName] = useState("");
  const [skillsBusy, setSkillsBusy] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);

  const siteCount = useMemo(
    () => org.reduce((n, b) => n + (b.sites?.length ?? 0), 0),
    [org],
  );

  const load = useCallback(async () => {
    const [branches, roles, skills] = await Promise.all([
      api<{ branches: OrgBranch[] }>("/v1/branches"),
      api<{ jobRoles: OrgJobRole[] }>("/v1/job-roles"),
      api<{ skills: CatalogSkill[] }>("/v1/employee-hr/skills"),
    ]);
    setOrg(branches.branches ?? []);
    setJobRoles(roles.jobRoles ?? []);
    setCatalogSkills(skills.skills ?? []);
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

  async function loadRoleDetails(roleId: string) {
    const [crit, skills] = await Promise.all([
      api<{ criteria: Criterion[] }>(`/v1/job-roles/${roleId}/criteria`),
      api<{ skills: RoleSkill[] }>(`/v1/job-roles/${roleId}/skills`),
    ]);
    setCriteria(crit.criteria ?? []);
    const map: Record<string, SkillLevel> = {};
    for (const s of skills.skills ?? []) {
      map[s.skillId] = s.requiredLevel;
    }
    setRoleSkills(map);
  }

  function openRoleEditor(role: OrgJobRole) {
    if (expandedRoleId === role.id) {
      setExpandedRoleId(null);
      return;
    }
    setExpandedRoleId(role.id);
    setEditName(role.name);
    setEditDescription(role.description ?? "");
    setEditResponsibilities(role.responsibilities ?? "");
    setEditRequirements(role.requirements ?? "");
    setCriterionName("");
    setCriterionMetric("");
    setCriterionWeight("1");
    setError(null);
    void loadRoleDetails(role.id).catch((err) =>
      setError(err instanceof Error ? err.message : t("Failed")),
    );
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
        body: JSON.stringify({
          name,
          description: jobRoleDescription.trim() || null,
          responsibilities: jobRoleResponsibilities.trim() || null,
          requirements: jobRoleRequirements.trim() || null,
        }),
      });
      setJobRoleName("");
      setJobRoleDescription("");
      setJobRoleResponsibilities("");
      setJobRoleRequirements("");
      setShowAddRole(false);
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job role");
    }
  }

  async function saveJobRole(roleId: string) {
    const name = editName.trim();
    if (!name) return;
    setEditBusy(true);
    setError(null);
    try {
      await api(`/v1/job-roles/${roleId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name,
          description: editDescription.trim() || null,
          responsibilities: editResponsibilities.trim() || null,
          requirements: editRequirements.trim() || null,
        }),
      });
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setEditBusy(false);
    }
  }

  async function removeJobRole() {
    const role = pendingJobRole;
    if (!role) return;
    setError(null);
    setJobRoleBusy(true);
    try {
      await api(`/v1/job-roles/${role.id}`, { method: "DELETE" });
      if (expandedRoleId === role.id) setExpandedRoleId(null);
      setPendingJobRole(null);
      await afterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove job role");
    } finally {
      setJobRoleBusy(false);
    }
  }

  async function addCriterion(roleId: string, e: FormEvent) {
    e.preventDefault();
    const name = criterionName.trim();
    if (!name) return;
    setCriterionBusy(true);
    setError(null);
    try {
      await api(`/v1/job-roles/${roleId}/criteria`, {
        method: "POST",
        body: JSON.stringify({
          name,
          metric: criterionMetric.trim() || null,
          weight: Number(criterionWeight) || 1,
        }),
      });
      setCriterionName("");
      setCriterionMetric("");
      setCriterionWeight("1");
      await loadRoleDetails(roleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setCriterionBusy(false);
    }
  }

  async function removeCriterion(roleId: string) {
    const row = pendingCriterion;
    if (!row) return;
    setCriterionBusy(true);
    setError(null);
    try {
      await api(`/v1/job-roles/${roleId}/criteria/${row.id}`, {
        method: "DELETE",
      });
      setPendingCriterion(null);
      await loadRoleDetails(roleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setCriterionBusy(false);
    }
  }

  async function createCatalogSkill(e: FormEvent, assignToExpandedRole = false) {
    e.preventDefault();
    const name = newSkillName.trim();
    if (!name) return;
    setSkillsBusy(true);
    setError(null);
    try {
      const res = await api<{ skill: CatalogSkill }>("/v1/employee-hr/skills", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setNewSkillName("");
      setCatalogSkills((prev) =>
        [...prev, res.skill].sort((a, b) => a.name.localeCompare(b.name)),
      );
      if (assignToExpandedRole) {
        setRoleSkills((prev) => ({
          ...prev,
          [res.skill.id]: "competent",
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setSkillsBusy(false);
    }
  }

  async function removeCatalogSkill() {
    const skill = pendingSkill;
    if (!skill) return;
    setSkillsBusy(true);
    setError(null);
    try {
      await api(`/v1/employee-hr/skills/${skill.id}`, { method: "DELETE" });
      setPendingSkill(null);
      setCatalogSkills((prev) => prev.filter((s) => s.id !== skill.id));
      setRoleSkills((prev) => {
        const next = { ...prev };
        delete next[skill.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setSkillsBusy(false);
    }
  }

  async function saveRoleSkills(roleId: string) {
    setSkillsBusy(true);
    setError(null);
    try {
      await api(`/v1/job-roles/${roleId}/skills`, {
        method: "PUT",
        body: JSON.stringify(
          Object.entries(roleSkills).map(([skillId, requiredLevel]) => ({
            skillId,
            requiredLevel,
          })),
        ),
      });
      await loadRoleDetails(roleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setSkillsBusy(false);
    }
  }

  const listedRoles =
    layout === "grid" && expandedRoleId
      ? jobRoles.filter((r) => r.id === expandedRoleId)
      : jobRoles;

  const rolesBlock = (
    <div className="space-y-4">
      {layout !== "grid" ? (
        <p className="text-sm text-muted-foreground">
          {t("Functions people perform (sales, driver, coordinator). Separate from Admin or Employee access.")}
        </p>
      ) : null}
      <ul className="space-y-2 text-sm">
        {listedRoles.map((role) => {
          const expanded = expandedRoleId === role.id;
          return (
            <li
              key={role.id}
              className="rounded-md border border-border px-3 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{role.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {role.employeeCount ?? 0} {t("assigned")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openRoleEditor(role)}
                  >
                    {expanded ? t("Collapse") : t("Edit")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingJobRole(role)}
                  >
                    {t("Remove")}
                  </Button>
                </div>
              </div>
              {expanded ? (
                <div className="mt-3 space-y-4 border-t pt-3">
                  <div className="grid gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Role name")}</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Job description")}</Label>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-sm"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder={t("Job description")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Responsibilities")}</Label>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-sm"
                        value={editResponsibilities}
                        onChange={(e) =>
                          setEditResponsibilities(e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t("Requirements")}</Label>
                      <textarea
                        className="min-h-16 w-full rounded-md border border-input bg-background p-2 text-sm"
                        value={editRequirements}
                        onChange={(e) => setEditRequirements(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={editBusy}
                      onClick={() => void saveJobRole(role.id)}
                    >
                      {editBusy ? t("Saving…") : t("Save role")}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Criteria")}
                    </p>
                    <ul className="space-y-1">
                      {criteria.map((c) => (
                        <li
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-1.5"
                        >
                          <span>
                            {c.name}
                            {c.metric ? (
                              <span className="text-muted-foreground">
                                {" "}
                                · {c.metric}
                              </span>
                            ) : null}
                            <span className="text-muted-foreground">
                              {" "}
                              · {t("Weight")} {c.weight}
                            </span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setPendingCriterion(c)}
                          >
                            {t("Remove")}
                          </Button>
                        </li>
                      ))}
                      {criteria.length === 0 ? (
                        <li className="text-muted-foreground">
                          {t("No criteria yet.")}
                        </li>
                      ) : null}
                    </ul>
                    <form
                      className="grid gap-2 sm:grid-cols-4"
                      onSubmit={(e) => void addCriterion(role.id, e)}
                    >
                      <Input
                        placeholder={t("Criterion name")}
                        value={criterionName}
                        onChange={(e) => setCriterionName(e.target.value)}
                        required
                      />
                      <Input
                        placeholder={t("Metric (optional)")}
                        value={criterionMetric}
                        onChange={(e) => setCriterionMetric(e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder={t("Weight")}
                        value={criterionWeight}
                        onChange={(e) => setCriterionWeight(e.target.value)}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={criterionBusy}
                        className="w-full sm:w-auto"
                      >
                        {t("Add criterion")}
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("Required skills")}
                    </p>
                    <ul className="space-y-2">
                      {catalogSkills.map((skill) => {
                        const on = skill.id in roleSkills;
                        return (
                          <li
                            key={skill.id}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={(e) =>
                                  setRoleSkills((prev) => {
                                    const next = { ...prev };
                                    if (e.target.checked) {
                                      next[skill.id] =
                                        prev[skill.id] ?? "competent";
                                    } else {
                                      delete next[skill.id];
                                    }
                                    return next;
                                  })
                                }
                              />
                              {skill.name}
                            </label>
                            {on ? (
                              <select
                                className={`${selectClass} sm:w-36`}
                                value={roleSkills[skill.id]}
                                onChange={(e) =>
                                  setRoleSkills((prev) => ({
                                    ...prev,
                                    [skill.id]: e.target
                                      .value as SkillLevel,
                                  }))
                                }
                              >
                                {SKILL_LEVELS.map((level) => (
                                  <option key={level} value={level}>
                                    {t(LEVEL_LABEL[level])}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </li>
                        );
                      })}
                      {catalogSkills.length === 0 ? (
                        <li className="text-muted-foreground">
                          {t("No skills in catalog yet.")}
                        </li>
                      ) : null}
                    </ul>
                    <form
                      className="flex flex-col gap-2 sm:flex-row"
                      onSubmit={(e) => void createCatalogSkill(e, true)}
                    >
                      <Input
                        placeholder={t("New skill name")}
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={skillsBusy}
                        className="w-full sm:w-auto"
                      >
                        {t("Create skill")}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={skillsBusy}
                      onClick={() => void saveRoleSkills(role.id)}
                    >
                      {skillsBusy ? t("Saving…") : t("Save required skills")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
        {listedRoles.length === 0 ? (
          <li className="text-muted-foreground">{t("No job roles yet.")}</li>
        ) : null}
      </ul>
      {layout !== "grid" ? (
        <form className="space-y-2" onSubmit={createJobRole}>
          <Input
            placeholder={t("Role name (Sales, Driver…)")}
            value={jobRoleName}
            onChange={(e) => setJobRoleName(e.target.value)}
            required
          />
          <textarea
            className="min-h-14 w-full rounded-md border border-input bg-background p-2 text-sm"
            placeholder={t("Job description")}
            value={jobRoleDescription}
            onChange={(e) => setJobRoleDescription(e.target.value)}
          />
          <textarea
            className="min-h-14 w-full rounded-md border border-input bg-background p-2 text-sm"
            placeholder={t("Responsibilities")}
            value={jobRoleResponsibilities}
            onChange={(e) => setJobRoleResponsibilities(e.target.value)}
          />
          <textarea
            className="min-h-14 w-full rounded-md border border-input bg-background p-2 text-sm"
            placeholder={t("Requirements")}
            value={jobRoleRequirements}
            onChange={(e) => setJobRoleRequirements(e.target.value)}
          />
          <Button type="submit" className="w-full sm:w-auto">
            {t("Add")}
          </Button>
        </form>
      ) : null}
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
                  , {b.sites.map((s) => s.name).join(", ")}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPendingBranch(b)}
            >
              {t("Remove")}
            </Button>
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
          {t("Add branch")}
        </Button>
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
          {t("Add site")}
        </Button>
      </form>
    </div>
  );

  const skillsBlock = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t(
          "Build the skill catalog here, then open a job role’s Edit to mark which skills that role requires. Assign employee levels on each employee’s sheet.",
        )}
      </p>
      <ul className="space-y-2 text-sm">
        {catalogSkills.map((skill) => (
          <li
            key={skill.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
          >
            <span className="font-medium">{skill.name}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPendingSkill(skill)}
            >
              {t("Remove")}
            </Button>
          </li>
        ))}
        {catalogSkills.length === 0 ? (
          <li className="rounded-md border border-dashed px-3 py-4 text-muted-foreground">
            {t("No skills yet. Add the first skill below (for example Safe driving).")}
          </li>
        ) : null}
      </ul>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => void createCatalogSkill(e, false)}
      >
        <Input
          placeholder={t("Skill name (Safe driving, Negotiation…)")}
          value={newSkillName}
          onChange={(e) => setNewSkillName(e.target.value)}
          required
        />
        <Button
          type="submit"
          disabled={skillsBusy}
          className="w-full sm:w-auto"
        >
          {skillsBusy ? t("Saving…") : t("Add skill")}
        </Button>
      </form>
    </div>
  );

  if (loading) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-4">
      {error ? <Notice tone="warn">{error}</Notice> : null}

      {layout === "grid" ? (
        <div className="grid gap-3.5 lg:grid-cols-12">
          <section className="min-w-0 rounded-lg border border-line bg-surface p-5 lg:col-span-7">
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Branches and sites")}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {org.length} {org.length === 1 ? t("branch") : t("branches")} ·{" "}
                {siteCount} {siteCount === 1 ? t("site") : t("sites")}
              </p>
            </div>
            <div className="min-w-0">
              {org.length === 0 ? (
                <p className="py-4 text-sm text-ink-muted">
                  {t("No branches yet.")}
                </p>
              ) : (
                org.map((b) => (
                  <ListRow
                    key={b.id}
                    leading={
                      <IconTile tone="ink">
                        <Building2 className="h-4 w-4" aria-hidden />
                      </IconTile>
                    }
                    title={b.name}
                    subtitle={
                      b.sites.length
                        ? `${b.code} · ${b.sites.length} ${
                            b.sites.length === 1 ? t("site") : t("sites")
                          } · ${b.sites.map((s) => s.name).join(", ")}`
                        : b.code
                    }
                    value={
                      <span className="flex flex-wrap items-center justify-end gap-1.5">
                        <Chip>
                          {b.sites.length}{" "}
                          {b.sites.length === 1 ? t("site") : t("sites")}
                        </Chip>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          aria-label={t("Remove")}
                          onClick={() => setPendingBranch(b)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </span>
                    }
                  />
                ))
              )}
            </div>
            <div id="org-add-branch" className="mt-4 space-y-3 border-t border-line pt-4">
              <form
                className="grid gap-2 sm:grid-cols-3"
                onSubmit={createBranch}
              >
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
                  {t("Add branch")}
                </Button>
              </form>
              <form
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
                onSubmit={createSite}
              >
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
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {t("Add site")}
                </Button>
              </form>
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-line bg-surface p-5 lg:col-span-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-ink">
                  {t("Job roles")}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  {jobRoles.length}{" "}
                  {jobRoles.length === 1 ? t("role") : t("roles")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowAddRole((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {t("Add")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {jobRoles.map((role) => {
                const on = expandedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => openRoleEditor(role)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
                  >
                    <Chip tone={on ? "ink" : "neutral"} className="cursor-pointer">
                      {role.name}
                    </Chip>
                  </button>
                );
              })}
              {jobRoles.length === 0 ? (
                <p className="text-sm text-ink-muted">{t("No job roles yet.")}</p>
              ) : null}
            </div>
            {showAddRole ? (
              <form className="mt-4 space-y-2 border-t border-line pt-4" onSubmit={createJobRole}>
                <Input
                  placeholder={t("Role name (Sales, Driver…)")}
                  value={jobRoleName}
                  onChange={(e) => setJobRoleName(e.target.value)}
                  required
                />
                <textarea
                  className="min-h-14 w-full rounded-md border border-input bg-background p-2 text-sm"
                  placeholder={t("Job description")}
                  value={jobRoleDescription}
                  onChange={(e) => setJobRoleDescription(e.target.value)}
                />
                <Button type="submit" size="sm" className="w-full sm:w-auto">
                  {t("Add")}
                </Button>
              </form>
            ) : null}
            {expandedRoleId ? (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {rolesBlock}
              </div>
            ) : null}
          </section>

          <section className="min-w-0 rounded-lg border border-line bg-surface p-5 lg:col-span-12">
            <div className="mb-3">
              <h2 className="text-[15px] font-semibold text-ink">
                {t("Skills catalog")}
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-muted">
                {catalogSkills.length}{" "}
                {catalogSkills.length === 1 ? t("skill") : t("skills")}
              </p>
            </div>
            {skillsBlock}
          </section>
        </div>
      ) : layout === "details" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <details className="rounded-lg border bg-card" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {t("Job roles")}
              <span className="ml-2 font-normal text-muted-foreground">
                {jobRoles.length}
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">{rolesBlock}</div>
          </details>
          <details className="rounded-lg border bg-card" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {t("Skills catalog")}
              <span className="ml-2 font-normal text-muted-foreground">
                {catalogSkills.length}
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">{skillsBlock}</div>
          </details>
          <details className="rounded-lg border bg-card lg:col-span-2" open>
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
              {t("Branches & sites")}
              <span className="ml-2 font-normal text-muted-foreground">
                {org.length}
              </span>
            </summary>
            <div className="space-y-4 border-t px-4 py-4">{branchesBlock}</div>
          </details>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-card-title">
              {t("Job roles")}{" "}
              <span className="font-normal text-muted-foreground">
                ({jobRoles.length})
              </span>
            </h2>
            {rolesBlock}
          </section>
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-card-title">
              {t("Skills catalog")}{" "}
              <span className="font-normal text-muted-foreground">
                ({catalogSkills.length})
              </span>
            </h2>
            {skillsBlock}
          </section>
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold text-card-title">
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
      <ConfirmDialog
        open={Boolean(pendingCriterion && expandedRoleId)}
        title={`Remove criterion “${pendingCriterion?.name}”?`}
        description="This cannot be undone."
        confirmLabel="Remove"
        variant="destructive"
        busy={criterionBusy}
        onConfirm={() => {
          if (expandedRoleId) void removeCriterion(expandedRoleId);
        }}
        onOpenChange={(open) => {
          if (!open && !criterionBusy) setPendingCriterion(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingSkill)}
        title={`${t("Remove skill")} “${pendingSkill?.name}”?`}
        description={t(
          "Removes it from the catalog and from any role requirements. Employee skill rows for this skill are removed.",
        )}
        confirmLabel={t("Remove")}
        variant="destructive"
        busy={skillsBusy}
        onConfirm={() => void removeCatalogSkill()}
        onOpenChange={(open) => {
          if (!open && !skillsBusy) setPendingSkill(null);
        }}
      />
    </div>
  );
}
