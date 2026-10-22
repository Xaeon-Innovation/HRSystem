"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPLOYEE_DOCUMENT_TYPES,
  SKILL_LEVELS,
  type AssessmentPeriod,
  type EmployeeDocumentType,
  type SkillLevel,
  type TrainingStatus,
} from "@hr/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { t } from "@/i18n";

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const DOC_TYPE_LABEL: Record<EmployeeDocumentType, string> = {
  passport: "Passport",
  residency: "Residency",
  driving_license: "Driving license",
  contract: "Contract",
  other: "Other",
};

const LEVEL_LABEL: Record<SkillLevel, string> = {
  basic: "Basic",
  competent: "Competent",
  strong: "Strong",
};

type HrDocument = {
  id: string;
  type: EmployeeDocumentType;
  label: string | null;
  documentNumber: string | null;
  expiresOn: string;
};

type CatalogSkill = { id: string; name: string };

type EmpSkill = {
  skillId: string;
  skillName: string;
  level: SkillLevel;
  note: string | null;
};

type TrainingRow = {
  id: string;
  skillName: string;
  reason: string;
  status: TrainingStatus;
  note: string | null;
};

type Criterion = {
  id: string;
  name: string;
  metric: string | null;
  weight: number;
};

type JobRoleOpt = { id: string; name: string };

function daysUntil(isoDate: string) {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const target = Date.UTC(y!, m! - 1, d!);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

function ExpiryBadge({ expiresOn }: { expiresOn: string }) {
  const days = daysUntil(expiresOn);
  if (days < 0) {
    return (
      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive">
        {t("Expired")}
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900 dark:text-amber-200">
        {t("Expiring soon")}
      </span>
    );
  }
  return null;
}

export function EmployeeHrPanel({
  employeeId,
  jobRoles,
}: {
  employeeId: string;
  jobRoles: JobRoleOpt[];
}) {
  const [tab, setTab] = useState("documents");
  const [error, setError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [docType, setDocType] = useState<EmployeeDocumentType>("passport");
  const [docLabel, setDocLabel] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docExpires, setDocExpires] = useState("");
  const [docBusy, setDocBusy] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<HrDocument | null>(null);

  const [catalog, setCatalog] = useState<CatalogSkill[]>([]);
  const [empSkills, setEmpSkills] = useState<
    Record<string, { level: SkillLevel; needsStrengthening: boolean }>
  >({});
  const [skillsBusy, setSkillsBusy] = useState(false);

  const [training, setTraining] = useState<TrainingRow[]>([]);
  const [trainingBusyId, setTrainingBusyId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<TrainingRow | null>(null);

  const [assessPeriod, setAssessPeriod] = useState<AssessmentPeriod>("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [assessRoleId, setAssessRoleId] = useState(jobRoles[0]?.id ?? "");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = useState("");
  const [assessBusy, setAssessBusy] = useState(false);
  const [assessMsg, setAssessMsg] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    const data = await api<{ documents: HrDocument[] }>(
      `/v1/employee-hr/employees/${employeeId}/documents`,
    );
    setDocuments(data.documents ?? []);
  }, [employeeId]);

  const loadSkills = useCallback(async () => {
    const [cat, emp] = await Promise.all([
      api<{ skills: CatalogSkill[] }>("/v1/employee-hr/skills"),
      api<{ skills: EmpSkill[] }>(
        `/v1/employee-hr/employees/${employeeId}/skills`,
      ),
    ]);
    setCatalog(cat.skills ?? []);
    const map: Record<string, { level: SkillLevel; needsStrengthening: boolean }> =
      {};
    for (const s of emp.skills ?? []) {
      map[s.skillId] = { level: s.level, needsStrengthening: false };
    }
    setEmpSkills(map);
  }, [employeeId]);

  const loadTraining = useCallback(async () => {
    const data = await api<{ training: TrainingRow[] }>(
      `/v1/employee-hr/training?employeeId=${encodeURIComponent(employeeId)}`,
    );
    setTraining(data.training ?? []);
  }, [employeeId]);

  const loadCriteria = useCallback(async (roleId: string) => {
    if (!roleId) {
      setCriteria([]);
      return;
    }
    const data = await api<{ criteria: Criterion[] }>(
      `/v1/job-roles/${roleId}/criteria`,
    );
    setCriteria(data.criteria ?? []);
    setScores({});
  }, []);

  useEffect(() => {
    setError(null);
    void Promise.all([loadDocuments(), loadSkills(), loadTraining()]).catch(
      (e) => setError(e instanceof Error ? e.message : t("Failed")),
    );
  }, [loadDocuments, loadSkills, loadTraining]);

  useEffect(() => {
    if (!assessRoleId && jobRoles[0]) setAssessRoleId(jobRoles[0].id);
  }, [jobRoles, assessRoleId]);

  useEffect(() => {
    if (tab !== "assessment" || !assessRoleId) return;
    void loadCriteria(assessRoleId).catch((e) =>
      setError(e instanceof Error ? e.message : t("Failed")),
    );
  }, [tab, assessRoleId, loadCriteria]);

  const selectedSkillIds = useMemo(
    () => Object.keys(empSkills),
    [empSkills],
  );

  async function addDocument(e: FormEvent) {
    e.preventDefault();
    if (!docExpires) return;
    setDocBusy(true);
    setError(null);
    try {
      await api(`/v1/employee-hr/employees/${employeeId}/documents`, {
        method: "POST",
        body: JSON.stringify({
          type: docType,
          label: docLabel.trim() || null,
          documentNumber: docNumber.trim() || null,
          expiresOn: docExpires,
        }),
      });
      setDocLabel("");
      setDocNumber("");
      setDocExpires("");
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setDocBusy(false);
    }
  }

  async function confirmDeleteDoc() {
    const doc = pendingDoc;
    if (!doc) return;
    setDocBusy(true);
    setError(null);
    try {
      await api(`/v1/employee-hr/documents/${doc.id}`, { method: "DELETE" });
      setPendingDoc(null);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setDocBusy(false);
    }
  }

  function toggleSkill(skillId: string, on: boolean) {
    setEmpSkills((prev) => {
      const next = { ...prev };
      if (on) {
        next[skillId] = prev[skillId] ?? {
          level: "competent",
          needsStrengthening: false,
        };
      } else {
        delete next[skillId];
      }
      return next;
    });
  }

  async function saveSkills() {
    setSkillsBusy(true);
    setError(null);
    try {
      await api(`/v1/employee-hr/employees/${employeeId}/skills`, {
        method: "PUT",
        body: JSON.stringify(
          selectedSkillIds.map((skillId) => ({
            skillId,
            level: empSkills[skillId]!.level,
            needsStrengthening: empSkills[skillId]!.needsStrengthening,
          })),
        ),
      });
      await Promise.all([loadSkills(), loadTraining()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setSkillsBusy(false);
    }
  }

  async function patchTraining(id: string, status: TrainingStatus) {
    setTrainingBusyId(id);
    setError(null);
    try {
      await api(`/v1/employee-hr/training/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setPendingCancel(null);
      await loadTraining();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setTrainingBusyId(null);
    }
  }

  async function submitAssessment(e: FormEvent) {
    e.preventDefault();
    if (!assessRoleId || !periodStart || !periodEnd) return;
    setAssessBusy(true);
    setError(null);
    setAssessMsg(null);
    try {
      const scoreRows = criteria.map((c) => ({
        criterionId: c.id,
        score: Number(scores[c.id] ?? 0),
      }));
      if (scoreRows.some((s) => !Number.isFinite(s.score))) {
        setError(t("Enter a score for each criterion"));
        return;
      }
      await api("/v1/employee-hr/assessments", {
        method: "POST",
        body: JSON.stringify({
          employeeId,
          jobRoleId: assessRoleId,
          period: assessPeriod,
          periodStart,
          periodEnd,
          scores: scoreRows,
          overallComment: overallComment.trim() || null,
        }),
      });
      setAssessMsg(t("Assessment saved."));
      setOverallComment("");
      setScores({});
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed"));
    } finally {
      setAssessBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-secondary/20 p-3">
      <p className="text-sm font-medium">{t("HR records")}</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="documents">{t("Documents")}</TabsTrigger>
          <TabsTrigger value="skills">{t("Skills")}</TabsTrigger>
          <TabsTrigger value="training">{t("Training")}</TabsTrigger>
          <TabsTrigger value="assessment">{t("Assessment")}</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-3 space-y-3">
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {t(DOC_TYPE_LABEL[doc.type] ?? doc.type)}
                      {doc.label ? ` · ${doc.label}` : ""}
                    </span>
                    <ExpiryBadge expiresOn={doc.expiresOn} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {doc.documentNumber
                      ? `${t("No.")} ${doc.documentNumber} · `
                      : ""}
                    {t("Expires")} {doc.expiresOn}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setPendingDoc(doc)}
                >
                  {t("Delete")}
                </Button>
              </li>
            ))}
            {documents.length === 0 ? (
              <li className="text-sm text-muted-foreground">
                {t("No documents yet.")}
              </li>
            ) : null}
          </ul>
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={addDocument}
          >
            <div className="space-y-1">
              <Label className="text-xs">{t("Type")}</Label>
              <select
                className={selectClass}
                value={docType}
                onChange={(e) =>
                  setDocType(e.target.value as EmployeeDocumentType)
                }
              >
                {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(DOC_TYPE_LABEL[type])}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Expires on")}</Label>
              <Input
                type="date"
                value={docExpires}
                onChange={(e) => setDocExpires(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Label")}</Label>
              <Input
                value={docLabel}
                onChange={(e) => setDocLabel(e.target.value)}
                placeholder={t("Optional label")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Document number")}</Label>
              <Input
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder={t("Optional")}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                className="w-full sm:w-auto"
                disabled={docBusy}
              >
                {docBusy ? t("Adding…") : t("Add document")}
              </Button>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="skills" className="mt-3 space-y-3">
          {catalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Create skills in Job roles setup first.")}
            </p>
          ) : (
            <ul className="space-y-2">
              {catalog.map((skill) => {
                const on = Boolean(empSkills[skill.id]);
                const row = empSkills[skill.id];
                return (
                  <li
                    key={skill.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <label className="flex min-w-0 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          toggleSkill(skill.id, e.target.checked)
                        }
                      />
                      <span className="font-medium">{skill.name}</span>
                    </label>
                    {on && row ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                          className={`${selectClass} sm:w-36`}
                          value={row.level}
                          onChange={(e) =>
                            setEmpSkills((prev) => ({
                              ...prev,
                              [skill.id]: {
                                ...prev[skill.id]!,
                                level: e.target.value as SkillLevel,
                              },
                            }))
                          }
                        >
                          {SKILL_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {t(LEVEL_LABEL[level])}
                            </option>
                          ))}
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={row.needsStrengthening}
                            onChange={(e) =>
                              setEmpSkills((prev) => ({
                                ...prev,
                                [skill.id]: {
                                  ...prev[skill.id]!,
                                  needsStrengthening: e.target.checked,
                                },
                              }))
                            }
                          />
                          {t("Needs strengthening")}
                        </label>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={skillsBusy || catalog.length === 0}
            onClick={() => void saveSkills()}
          >
            {skillsBusy ? t("Saving…") : t("Save skills")}
          </Button>
        </TabsContent>

        <TabsContent value="training" className="mt-3 space-y-2">
          {training.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No training assignments.")}
            </p>
          ) : (
            training.map((row) => {
              const busy = trainingBusyId === row.id;
              const open =
                row.status === "proposed" || row.status === "in_progress";
              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.skillName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        row.status === "in_progress"
                          ? "In progress"
                          : row.status === "proposed"
                            ? "Proposed"
                            : row.status === "completed"
                              ? "Completed"
                              : "Cancelled",
                      )}{" "}
                      ·{" "}
                      {t(row.reason === "gap" ? "Skill gap" : "Strengthen")}
                    </p>
                  </div>
                  {open ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {row.status === "proposed" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={busy}
                          onClick={() =>
                            void patchTraining(row.id, "in_progress")
                          }
                        >
                          {t("Start")}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() => void patchTraining(row.id, "completed")}
                      >
                        {t("Complete")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() => setPendingCancel(row)}
                      >
                        {t("Cancel")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="assessment" className="mt-3 space-y-3">
          {jobRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("Assign a job role to this employee first.")}
            </p>
          ) : (
            <form className="space-y-3" onSubmit={submitAssessment}>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("Job role")}</Label>
                  <select
                    className={selectClass}
                    value={assessRoleId}
                    onChange={(e) => setAssessRoleId(e.target.value)}
                  >
                    {jobRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Period")}</Label>
                  <select
                    className={selectClass}
                    value={assessPeriod}
                    onChange={(e) =>
                      setAssessPeriod(e.target.value as AssessmentPeriod)
                    }
                  >
                    <option value="weekly">{t("Weekly")}</option>
                    <option value="monthly">{t("Monthly")}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Period start")}</Label>
                  <Input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Period end")}</Label>
                  <Input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    required
                  />
                </div>
              </div>
              {criteria.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("Add criteria for this job role in Org setup.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {criteria.map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="text-sm">
                        {c.name}
                        {c.metric ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {c.metric}
                          </span>
                        ) : null}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="w-full sm:w-24"
                        placeholder="0–100"
                        value={scores[c.id] ?? ""}
                        onChange={(e) =>
                          setScores((prev) => ({
                            ...prev,
                            [c.id]: e.target.value,
                          }))
                        }
                        required
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-1">
                <Label className="text-xs">{t("Overall comment")}</Label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm"
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value)}
                />
              </div>
              {assessMsg ? (
                <p className="text-sm text-emerald-700">{assessMsg}</p>
              ) : null}
              <Button
                type="submit"
                size="sm"
                className="w-full sm:w-auto"
                disabled={assessBusy || criteria.length === 0}
              >
                {assessBusy ? t("Saving…") : t("Submit assessment")}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={Boolean(pendingDoc)}
        title={
          pendingDoc
            ? `Delete “${DOC_TYPE_LABEL[pendingDoc.type]}${pendingDoc.label ? ` · ${pendingDoc.label}` : ""}”?`
            : "Delete document?"
        }
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        busy={docBusy}
        onConfirm={confirmDeleteDoc}
        onOpenChange={(open) => {
          if (!open && !docBusy) setPendingDoc(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingCancel)}
        title={
          pendingCancel
            ? `Cancel training for “${pendingCancel.skillName}”?`
            : "Cancel training?"
        }
        description="The assignment will be marked cancelled."
        confirmLabel="Cancel training"
        variant="destructive"
        busy={Boolean(pendingCancel && trainingBusyId === pendingCancel.id)}
        onConfirm={() => {
          if (pendingCancel) void patchTraining(pendingCancel.id, "cancelled");
        }}
        onOpenChange={(open) => {
          if (!open && !trainingBusyId) setPendingCancel(null);
        }}
      />
    </div>
  );
}
