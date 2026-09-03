"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  EMPLOYEE_CSV_TEMPLATE,
  EMPLOYEE_FIELD_DEFS,
  draftToCreatePayload,
  emptyEmployeeDraft,
  evaluateEmployeeDraft,
  isEmployeeDraftComplete,
  parseEmployeeCsv,
  type EmployeeCsvFieldKey,
  type EmployeeDraft,
  type ParsedEmployeeRow,
} from "@hr/shared";

type Site = {
  id: string;
  name: string;
  code: string;
  branchId: string;
};

type Branch = {
  id: string;
  name: string;
  code: string;
  status: string;
  sites: Site[];
};

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  jobRoles: JobRoleSummary[];
  status: string;
  phone: string | null;
  avatarUrl?: string | null;
  nationalId: string | null;
  dateOfBirth: string | null;
  address: string | null;
  hireDate: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  branchId: string | null;
  siteId: string | null;
  geofenceLat: number | null;
  geofenceLng: number | null;
  geofenceRadiusMeters: number | null;
};

type JobRoleSummary = {
  id: string;
  name: string;
};

type JobRole = JobRoleSummary & {
  employeeCount?: number;
};

type CreatedImport = {
  id: string;
  email: string;
  name: string;
  temporaryPassword?: string;
};

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

const ROLE_LABEL: Record<string, string> = {
  employee: "Employee access",
  tenant_admin: "Admin access",
};

function JobRolePicker({
  roles,
  selectedIds,
  onChange,
}: {
  roles: JobRole[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (roles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Create job roles in the Job roles section, then assign them here.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((role) => {
        const on = selectedIds.includes(role.id);
        return (
          <label
            key={role.id}
            className={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs ${
              on
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input bg-background text-muted-foreground"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={on}
              onChange={() =>
                onChange(
                  on
                    ? selectedIds.filter((id) => id !== role.id)
                    : [...selectedIds, role.id],
                )
              }
            />
            {role.name}
          </label>
        );
      })}
    </div>
  );
}

function profileComplete(emp: Employee) {
  return Boolean(
    emp.name &&
      emp.email &&
      emp.phone &&
      emp.jobTitle &&
      emp.nationalId &&
      emp.dateOfBirth &&
      emp.address &&
      emp.hireDate,
  );
}

function employeeToDraft(emp: Employee): EmployeeDraft {
  return {
    name: emp.name ?? "",
    email: emp.email ?? "",
    phone: emp.phone ?? "",
    role: emp.role === "tenant_admin" ? "tenant_admin" : "employee",
    jobTitle: emp.jobTitle ?? "",
    nationalId: emp.nationalId ?? "",
    dateOfBirth: (emp.dateOfBirth ?? "").slice(0, 10),
    address: emp.address ?? "",
    hireDate: (emp.hireDate ?? "").slice(0, 10),
    emergencyContactName: emp.emergencyContactName ?? "",
    emergencyContactPhone: emp.emergencyContactPhone ?? "",
    branchCode: "",
  };
}

const PROFILE_FIELD_DEFS = EMPLOYEE_FIELD_DEFS.filter(
  (f) => f.key !== "branchCode",
);

function ProfileFieldGrid({
  draft,
  onChange,
}: {
  draft: EmployeeDraft;
  onChange: (key: EmployeeCsvFieldKey, value: string) => void;
}) {
  const evaluation = evaluateEmployeeDraft(draft);
  return PROFILE_FIELD_DEFS.map((field) => {
    const missing = evaluation.missing.includes(field.key);
    const fieldErr = evaluation.errors.find((e) => e.field === field.key);
    return (
      <div
        key={field.key}
        className={
          field.key === "address" ? "space-y-1 md:col-span-2" : "space-y-1"
        }
      >
        <Label>
          {field.key === "role" ? "Access" : field.label}
          {field.required ? " *" : ""}
        </Label>
        {field.key === "role" ? (
          <select
            className={selectClass}
            value={draft.role || "employee"}
            onChange={(e) => onChange("role", e.target.value)}
          >
            <option value="employee">Employee</option>
            <option value="tenant_admin">Admin</option>
          </select>
        ) : (
          <Input
            type={field.type === "select" ? "text" : field.type}
            value={draft[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={missing || fieldErr ? "border-destructive" : undefined}
          />
        )}
        {fieldErr ? (
          <p className="text-xs text-destructive">{fieldErr.message}</p>
        ) : null}
      </div>
    );
  });
}

function downloadTemplate() {
  const blob = new Blob([EMPLOYEE_CSV_TEMPLATE], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employee-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function EmployeesPage() {
  const [tab, setTab] = useState("roster");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [org, setOrg] = useState<Branch[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [createJobRoleIds, setCreateJobRoleIds] = useState<string[]>([]);
  const [editJobRoleIds, setEditJobRoleIds] = useState<string[]>([]);
  const [jobRoleName, setJobRoleName] = useState("");
  const [pendingJobRole, setPendingJobRole] = useState<JobRole | null>(null);
  const [jobRoleBusy, setJobRoleBusy] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<EmployeeDraft>(emptyEmployeeDraft);
  const [branchId, setBranchId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [reviewRows, setReviewRows] = useState<ParsedEmployeeRow[] | null>(
    null,
  );
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteCode, setSiteCode] = useState("");
  const [siteBranchId, setSiteBranchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<CreatedImport[]>([]);
  const [zoneEditId, setZoneEditId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [zoneLat, setZoneLat] = useState("");
  const [zoneLng, setZoneLng] = useState("");
  const [zoneRadius, setZoneRadius] = useState(
    String(DEFAULT_GEOFENCE_RADIUS_METERS),
  );
  const [zoneBusy, setZoneBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EmployeeDraft>(emptyEmployeeDraft);
  const [editBranchId, setEditBranchId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editSaving, setEditSaving] = useState(false);
  const [pendingBranch, setPendingBranch] = useState<Branch | null>(null);
  const [branchBusy, setBranchBusy] = useState(false);

  async function load(search = q) {
    const [empData, branchData, roleData] = await Promise.all([
      api<{ employees: Employee[] }>(
        `/v1/employees${search ? `?q=${encodeURIComponent(search)}` : ""}`,
      ),
      api<{ branches: Branch[] }>("/v1/branches"),
      api<{ jobRoles: JobRole[] }>("/v1/job-roles"),
    ]);
    setEmployees(
      empData.employees.map((e) => ({ ...e, jobRoles: e.jobRoles ?? [] })),
    );
    setOrg(branchData.branches);
    setJobRoles(roleData.jobRoles);
    if (!siteBranchId && branchData.branches[0]) {
      setSiteBranchId(branchData.branches[0].id);
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  function branchNameOf(id: string | null) {
    if (!id) return "Unassigned";
    return org.find((b) => b.id === id)?.name ?? "—";
  }

  function setFormField(key: EmployeeCsvFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openEditor(emp: Employee) {
    setEditId(emp.id);
    setEditDraft(employeeToDraft(emp));
    setEditBranchId(emp.branchId ?? "");
    setEditStatus(emp.status === "inactive" ? "inactive" : "active");
    setEditJobRoleIds((emp.jobRoles ?? []).map((r) => r.id));
    setDetailsId(null);
    setZoneEditId(null);
    setError(null);
  }

  function closeEditor() {
    setEditId(null);
  }

  function setEditField(key: EmployeeCsvFieldKey, value: string) {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function saveEditor(employeeId: string) {
    const evaluation = evaluateEmployeeDraft(editDraft);
    if (evaluation.missing.length || evaluation.errors.length) {
      setError(
        evaluation.missing.length
          ? `Fill required fields: ${evaluation.missing
              .map(
                (k) =>
                  EMPLOYEE_FIELD_DEFS.find((f) => f.key === k)?.label ?? k,
              )
              .join(", ")}`
          : evaluation.errors[0].message,
      );
      return;
    }
    setEditSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = draftToCreatePayload(editDraft);
      await api(`/v1/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          role: payload.role,
          jobTitle: payload.jobTitle,
          nationalId: payload.nationalId,
          dateOfBirth: payload.dateOfBirth,
          address: payload.address,
          hireDate: payload.hireDate,
          emergencyContactName: payload.emergencyContactName,
          emergencyContactPhone: payload.emergencyContactPhone,
          branchId: editBranchId || null,
          status: editStatus,
          jobRoleIds: editJobRoleIds,
        }),
      });
      setEditId(null);
      setSuccess("Employee profile saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save employee");
    } finally {
      setEditSaving(false);
    }
  }

  function openZoneEditor(emp: Employee) {
    setZoneEditId(emp.id);
    setZoneLat(emp.geofenceLat != null ? String(emp.geofenceLat) : "");
    setZoneLng(emp.geofenceLng != null ? String(emp.geofenceLng) : "");
    setZoneRadius(
      String(emp.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS),
    );
  }

  async function saveZone(employeeId: string) {
    if (!zoneLat.trim() || !zoneLng.trim() || !zoneRadius.trim()) {
      setError("Enter latitude, longitude, and radius");
      return;
    }
    const lat = Number(zoneLat);
    const lng = Number(zoneLng);
    const radius = Math.round(Number(zoneRadius));
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(radius)
    ) {
      setError("Enter valid lat, lng, and radius");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError("Latitude must be -90…90 and longitude -180…180");
      return;
    }
    if (lat === 0 && lng === 0) {
      setError("Set a real center (0, 0 is not a valid work zone)");
      return;
    }
    if (
      radius < MIN_GEOFENCE_RADIUS_METERS ||
      radius > MAX_GEOFENCE_RADIUS_METERS
    ) {
      setError(
        `Radius must be between ${MIN_GEOFENCE_RADIUS_METERS} and ${MAX_GEOFENCE_RADIUS_METERS} meters`,
      );
      return;
    }
    setZoneBusy(true);
    setError(null);
    try {
      await api(`/v1/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          geofenceLat: lat,
          geofenceLng: lng,
          geofenceRadiusMeters: radius,
        }),
      });
      setZoneEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save zone");
    } finally {
      setZoneBusy(false);
    }
  }

  async function clearZone(employeeId: string) {
    setZoneBusy(true);
    setError(null);
    try {
      await api(`/v1/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          geofenceLat: null,
          geofenceLng: null,
          geofenceRadiusMeters: null,
        }),
      });
      setZoneEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear zone");
    } finally {
      setZoneBusy(false);
    }
  }

  async function createEmployee(e: FormEvent) {
    e.preventDefault();
    const evaluation = evaluateEmployeeDraft(form);
    if (evaluation.missing.length || evaluation.errors.length) {
      setError(
        evaluation.missing.length
          ? `Fill required fields: ${evaluation.missing
              .map((k) => EMPLOYEE_FIELD_DEFS.find((f) => f.key === k)?.label ?? k)
              .join(", ")}`
          : evaluation.errors[0].message,
      );
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = draftToCreatePayload(form);
      const res = await api<{
        employee: Employee;
        temporaryPassword?: string;
      }>("/v1/employees", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          branchCode: undefined,
          branchId: branchId || null,
          jobRoleIds: createJobRoleIds,
        }),
      });
      setForm(emptyEmployeeDraft());
      setBranchId("");
      setCreateJobRoleIds([]);
      setSuccess(`${res.employee.name} was added to the roster.`);
      if (res.temporaryPassword) {
        setCreatedCreds([
          {
            id: res.employee.id,
            email: res.employee.email,
            name: res.employee.name,
            temporaryPassword: res.temporaryPassword,
          },
        ]);
      } else {
        setCreatedCreds([]);
      }
      await load();
      setTab("roster");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function assignBranch(employeeId: string, nextBranchId: string) {
    try {
      await api(`/v1/employees/${employeeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          branchId: nextBranchId || null,
          siteId: null,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  function applyCsv(text: string, fileName?: string) {
    setError(null);
    setSuccess(null);
    setCsvText(text);
    setCsvFileName(fileName ?? null);
    const preview = parseEmployeeCsv(text);
    if (preview.rows.length === 0) {
      setReviewRows(null);
      setError("CSV needs a header row and at least one employee.");
      return;
    }
    setReviewRows(preview.rows);
  }

  function updateReviewRow(
    index: number,
    key: EmployeeCsvFieldKey,
    value: string,
  ) {
    setReviewRows((rows) => {
      if (!rows) return rows;
      return rows.map((row, i) => {
        if (i !== index) return row;
        const data = { ...row.data, [key]: value };
        const evaluation = evaluateEmployeeDraft(data);
        return {
          ...row,
          data,
          missing: evaluation.missing,
          errors: evaluation.errors,
        };
      });
    });
  }

  const incompleteCount = useMemo(
    () => reviewRows?.filter((row) => !isEmployeeDraftComplete(row.data)).length ?? 0,
    [reviewRows],
  );

  async function importReviewed() {
    if (!reviewRows?.length) return;
    if (incompleteCount > 0) {
      setError(
        `Fill missing information on ${incompleteCount} row${incompleteCount === 1 ? "" : "s"} before adding them to the system.`,
      );
      return;
    }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api<{
        created: CreatedImport[];
        errors: { index: number; error: string }[];
      }>("/v1/employees/import", {
        method: "POST",
        body: JSON.stringify({
          employees: reviewRows.map((row) => draftToCreatePayload(row.data)),
        }),
      });
      const failed = res.errors?.length ?? 0;
      const added = res.created?.length ?? 0;
      if (added > 0) {
        setSuccess(
          failed
            ? `Added ${added} employee${added === 1 ? "" : "s"}. ${failed} row${failed === 1 ? "" : "s"} could not be imported.`
            : `Added ${added} employee${added === 1 ? "" : "s"} to the system.`,
        );
        setCreatedCreds(res.created.filter((c) => c.temporaryPassword));
        setReviewRows(null);
        setCsvText("");
        setCsvFileName(null);
        await load();
        setTab("roster");
      } else {
        setError(
          res.errors.map((e) => `Row ${e.index + 1}: ${e.error}`).join(" · ") ||
            "Import failed",
        );
      }
      if (added > 0 && failed > 0) {
        setError(res.errors.map((e) => `Row ${e.index + 1}: ${e.error}`).join(" · "));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  async function createBranch(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/branches", {
        method: "POST",
        body: JSON.stringify({ name: branchName, code: branchCode }),
      });
      setBranchName("");
      setBranchCode("");
      await load();
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
      if (branchId === branch.id) setBranchId("");
      setPendingBranch(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove branch");
    } finally {
      setBranchBusy(false);
    }
  }

  async function createSite(e: FormEvent) {
    e.preventDefault();
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
      await load();
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
      await load();
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
      setCreateJobRoleIds((ids) => ids.filter((id) => id !== role.id));
      setEditJobRoleIds((ids) => ids.filter((id) => id !== role.id));
      setPendingJobRole(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove job role");
    } finally {
      setJobRoleBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Employees</h1>
        <p className="text-sm text-muted-foreground">
          View the roster or add people with full personal details — one at a
          time or from a CSV.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {createdCreds.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temporary passwords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Share these once. Employees should change them after first sign-in.
            </p>
            {createdCreds.map((c) => (
              <p key={c.id}>
                <span className="font-medium">{c.name}</span> ({c.email}):{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5">
                  {c.temporaryPassword}
                </code>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="roster">Employees</TabsTrigger>
          <TabsTrigger value="add">Add employees</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="space-y-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search name, email, phone, national ID…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(q);
              }}
            />
            <Button onClick={() => load(q)}>Search</Button>
          </div>
          <div className="space-y-2">
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employees yet. Use the Add employees tab to create or import
                a roster.
              </p>
            ) : null}
            {employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="space-y-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar
                        name={emp.name}
                        avatarUrl={emp.avatarUrl}
                        size="md"
                      />
                      <div className="min-w-0">
                      <p className="font-medium">
                        {emp.name}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {ROLE_LABEL[emp.role] ?? emp.role}
                        </span>
                        {!profileComplete(emp) ? (
                          <button
                            type="button"
                            className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 hover:bg-amber-200"
                            onClick={() => openEditor(emp)}
                          >
                            Incomplete profile
                          </button>
                        ) : null}
                      </p>
                      {(emp.jobRoles ?? []).length > 0 ? (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {(emp.jobRoles ?? []).map((role) => (
                            <span
                              key={role.id}
                              className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                            >
                              {role.name}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          No job roles
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {emp.jobTitle ?? "—"} · {emp.phone ?? "No phone"} ·{" "}
                        {emp.email} · {branchNameOf(emp.branchId)}
                        {emp.geofenceRadiusMeters != null
                          ? ` · zone ${emp.geofenceRadiusMeters}m`
                          : " · no zone"}
                      </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          !profileComplete(emp) ? "default" : "outline"
                        }
                        onClick={() =>
                          editId === emp.id ? closeEditor() : openEditor(emp)
                        }
                      >
                        {editId === emp.id
                          ? "Cancel"
                          : profileComplete(emp)
                            ? "Edit"
                            : "Complete profile"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setDetailsId(detailsId === emp.id ? null : emp.id)
                        }
                      >
                        {detailsId === emp.id ? "Hide details" : "Details"}
                      </Button>
                      <a
                        href={`/app/analytics/employees/${emp.id}`}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Analytics
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          zoneEditId === emp.id
                            ? setZoneEditId(null)
                            : openZoneEditor(emp)
                        }
                      >
                        {zoneEditId === emp.id ? "Close zone" : "Work zone"}
                      </Button>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={emp.branchId ?? ""}
                        onChange={(e) => assignBranch(emp.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {org.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {emp.status}
                      </span>
                    </div>
                  </div>
                  {editId === emp.id ? (
                    <div className="space-y-3 rounded-lg border bg-secondary/30 p-3">
                      {!isEmployeeDraftComplete(editDraft) ? (
                        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                          Fill the highlighted fields to complete this profile.
                          Required information must be saved before the profile
                          is marked complete.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Update personal details, access, job roles, branch, or
                          status, then save.
                        </p>
                      )}
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        <ProfileFieldGrid
                          draft={editDraft}
                          onChange={setEditField}
                        />
                        <div className="space-y-1">
                          <Label>Branch</Label>
                          <select
                            className={selectClass}
                            value={editBranchId}
                            onChange={(e) => setEditBranchId(e.target.value)}
                          >
                            <option value="">Unassigned</option>
                            {org.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label>Status</Label>
                          <select
                            className={selectClass}
                            value={editStatus}
                            onChange={(e) =>
                              setEditStatus(
                                e.target.value === "inactive"
                                  ? "inactive"
                                  : "active",
                              )
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                        <div className="space-y-1 md:col-span-2 lg:col-span-3">
                          <Label>Job roles</Label>
                          <p className="text-xs text-muted-foreground">
                            Functions this person performs — separate from Admin
                            or Employee access. Select one or more.
                          </p>
                          <JobRolePicker
                            roles={jobRoles}
                            selectedIds={editJobRoleIds}
                            onChange={setEditJobRoleIds}
                          />
                        </div>
                        <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                          <Button
                            type="button"
                            disabled={editSaving}
                            onClick={() => void saveEditor(emp.id)}
                          >
                            {editSaving
                              ? "Saving…"
                              : profileComplete(emp)
                                ? "Save changes"
                                : "Save and complete"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={editSaving}
                            onClick={closeEditor}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {detailsId === emp.id && editId !== emp.id ? (
                    <dl className="grid gap-2 rounded-lg border bg-secondary/30 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          National ID
                        </dt>
                        <dd>{emp.nationalId ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Date of birth
                        </dt>
                        <dd>{emp.dateOfBirth ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Hire date
                        </dt>
                        <dd>{emp.hireDate ?? "—"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-muted-foreground">
                          Address
                        </dt>
                        <dd>{emp.address ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Job roles
                        </dt>
                        <dd>
                          {(emp.jobRoles ?? []).length
                            ? (emp.jobRoles ?? []).map((r) => r.name).join(", ")
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Access
                        </dt>
                        <dd>{ROLE_LABEL[emp.role] ?? emp.role}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Emergency contact
                        </dt>
                        <dd>
                          {emp.emergencyContactName ||
                          emp.emergencyContactPhone
                            ? `${emp.emergencyContactName ?? "—"} · ${emp.emergencyContactPhone ?? "—"}`
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                  {zoneEditId === emp.id ? (
                    <div className="rounded-lg border bg-secondary/30 p-3">
                      <p className="mb-2 text-xs text-muted-foreground">
                        Set a center and radius (meters). Clock-in/out must happen
                        inside this zone.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-xs">Latitude</Label>
                          <Input
                            value={zoneLat}
                            onChange={(e) => setZoneLat(e.target.value)}
                            placeholder="30.0444"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Longitude</Label>
                          <Input
                            value={zoneLng}
                            onChange={(e) => setZoneLng(e.target.value)}
                            placeholder="31.2357"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Radius (m)</Label>
                          <Input
                            type="number"
                            min={MIN_GEOFENCE_RADIUS_METERS}
                            max={MAX_GEOFENCE_RADIUS_METERS}
                            value={zoneRadius}
                            onChange={(e) => setZoneRadius(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-wrap items-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={zoneBusy}
                            onClick={() => void saveZone(emp.id)}
                          >
                            {zoneBusy ? "Saving…" : "Save"}
                          </Button>
                          {emp.geofenceRadiusMeters != null ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={zoneBusy}
                              onClick={() => void clearZone(emp.id)}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job roles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                These are the functions people perform (sales, driver,
                coordinator, and so on). They are not the same as Admin or
                Employee access. One person can have several.
              </p>
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
                        · {role.employeeCount ?? 0} assigned
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPendingJobRole(role)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
                {jobRoles.length === 0 ? (
                  <li className="text-muted-foreground">
                    No job roles yet. Add sales, driver, coordinator, or any
                    other function your team uses.
                  </li>
                ) : null}
              </ul>
              <form className="grid gap-3 md:grid-cols-3" onSubmit={createJobRole}>
                <Input
                  placeholder="Role name (Sales, Driver…)"
                  value={jobRoleName}
                  onChange={(e) => setJobRoleName(e.target.value)}
                  required
                />
                <Button type="submit" className="md:col-span-2 md:justify-self-start">
                  Add job role
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Branches & sites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      Remove
                    </Button>
                  </li>
                ))}
                {org.length === 0 ? (
                  <li className="text-muted-foreground">No branches yet.</li>
                ) : null}
              </ul>
              <form className="grid gap-3 md:grid-cols-3" onSubmit={createBranch}>
                <Input
                  placeholder="Branch name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Code (cairo)"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  required
                />
                <Button type="submit">Add branch</Button>
              </form>
              <form className="grid gap-3 md:grid-cols-4" onSubmit={createSite}>
                <select
                  className={selectClass}
                  value={siteBranchId}
                  onChange={(e) => setSiteBranchId(e.target.value)}
                  required
                >
                  <option value="">Branch</option>
                  {org.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Site name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Code"
                  value={siteCode}
                  onChange={(e) => setSiteCode(e.target.value)}
                  required
                />
                <Button type="submit" variant="secondary">
                  Add site
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add one employee</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" onSubmit={createEmployee}>
                <ProfileFieldGrid draft={form} onChange={setFormField} />
                <div className="space-y-1">
                  <Label>Branch</Label>
                  <select
                    className={selectClass}
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {org.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2 lg:col-span-3">
                  <Label>Job roles</Label>
                  <p className="text-xs text-muted-foreground">
                    Optional. Separate from Admin or Employee access — pick every
                    function this person covers.
                  </p>
                  <JobRolePicker
                    roles={jobRoles}
                    selectedIds={createJobRoleIds}
                    onChange={setCreateJobRoleIds}
                  />
                </div>
                <div className="flex items-end md:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Creating…" : "Create employee"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import from CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Required columns: name, email, phone, role (access: employee or
                tenant_admin), jobTitle, nationalId, dateOfBirth, address,
                hireDate. Optional: emergencyContactName, emergencyContactPhone,
                branchCode. Assign job roles after import. Incomplete rows must
                be filled in before anyone is added.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  Download template
                </Button>
                <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        applyCsv(String(reader.result ?? ""), file.name);
                      };
                      reader.readAsText(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {csvFileName ? (
                <p className="text-xs text-muted-foreground">File: {csvFileName}</p>
              ) : null}
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm"
                value={csvText}
                placeholder="Paste CSV here, or upload a file…"
                onChange={(e) => {
                  const text = e.target.value;
                  setCsvText(text);
                  if (!text.trim()) {
                    setReviewRows(null);
                    setCsvFileName(null);
                    return;
                  }
                  const preview = parseEmployeeCsv(text);
                  setReviewRows(preview.rows.length ? preview.rows : null);
                }}
              />
              {reviewRows ? (
                <div className="space-y-3">
                  {incompleteCount > 0 ? (
                    <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                      {incompleteCount} of {reviewRows.length} row
                      {reviewRows.length === 1 ? "" : "s"}{" "}
                      {incompleteCount === 1 ? "is" : "are"} missing required
                      information. Fill the highlighted fields before adding
                      these people to the system.
                    </p>
                  ) : (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                      All {reviewRows.length} row
                      {reviewRows.length === 1 ? "" : "s"} look complete. Review
                      then add them to the system.
                    </p>
                  )}
                  <div className="space-y-3">
                    {reviewRows.map((row, index) => {
                      const incomplete = !isEmployeeDraftComplete(row.data);
                      return (
                        <div
                          key={`${row.line}-${index}`}
                          className={`rounded-lg border p-3 ${
                            incomplete
                              ? "border-amber-300 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/40"
                              : "border-border"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">
                              Row {row.line}
                              {row.data.name ? ` · ${row.data.name}` : ""}
                              {incomplete ? (
                                <span className="ml-2 text-xs font-normal text-amber-800">
                                  Missing:{" "}
                                  {row.missing
                                    .map(
                                      (k) =>
                                        EMPLOYEE_FIELD_DEFS.find((f) => f.key === k)
                                          ?.label ?? k,
                                    )
                                    .join(", ")}
                                  {row.errors.length
                                    ? ` · ${row.errors.map((e) => e.message).join(", ")}`
                                    : ""}
                                </span>
                              ) : (
                                <span className="ml-2 text-xs font-normal text-emerald-700">
                                  Ready
                                </span>
                              )}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setReviewRows((rows) =>
                                  rows
                                    ? rows.filter((_, i) => i !== index)
                                    : rows,
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {EMPLOYEE_FIELD_DEFS.map((field) => {
                              const isMissing = row.missing.includes(field.key);
                              const fieldErr = row.errors.find(
                                (e) => e.field === field.key,
                              );
                              return (
                                <div key={field.key} className="space-y-1">
                                  <Label className="text-xs">
                                    {field.key === "role" ? "Access" : field.label}
                                    {field.required ? " *" : ""}
                                  </Label>
                                  {field.key === "role" ? (
                                    <select
                                      className={`${selectClass} h-9 ${
                                        isMissing || fieldErr
                                          ? "border-destructive"
                                          : ""
                                      }`}
                                      value={row.data.role || "employee"}
                                      onChange={(e) =>
                                        updateReviewRow(
                                          index,
                                          "role",
                                          e.target.value,
                                        )
                                      }
                                    >
                                      <option value="employee">Employee</option>
                                      <option value="tenant_admin">Admin</option>
                                    </select>
                                  ) : (
                                    <Input
                                      type={
                                        field.type === "select"
                                          ? "text"
                                          : field.type
                                      }
                                      value={row.data[field.key]}
                                      placeholder={field.placeholder}
                                      className={
                                        isMissing || fieldErr
                                          ? "border-destructive"
                                          : undefined
                                      }
                                      onChange={(e) =>
                                        updateReviewRow(
                                          index,
                                          field.key,
                                          e.target.value,
                                        )
                                      }
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    type="button"
                    disabled={importing || incompleteCount > 0 || !reviewRows.length}
                    onClick={() => void importReviewed()}
                  >
                    {importing
                      ? "Adding…"
                      : incompleteCount > 0
                        ? "Fill missing info to continue"
                        : `Add ${reviewRows.length} employee${reviewRows.length === 1 ? "" : "s"} to the system`}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={Boolean(pendingBranch)}
        title={pendingBranch ? `Remove branch “${pendingBranch.name}”?` : "Remove branch?"}
        description="Sites under it will be deleted and employees will be unassigned."
        confirmLabel="Remove"
        variant="destructive"
        busy={branchBusy}
        onConfirm={removeBranch}
        onOpenChange={(next) => {
          if (!next && !branchBusy) setPendingBranch(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingJobRole)}
        title={
          pendingJobRole
            ? `Remove job role “${pendingJobRole.name}”?`
            : "Remove job role?"
        }
        description="People who had this role will keep their other roles. Access (Admin or Employee) is not affected."
        confirmLabel="Remove"
        variant="destructive"
        busy={jobRoleBusy}
        onConfirm={removeJobRole}
        onOpenChange={(next) => {
          if (!next && !jobRoleBusy) setPendingJobRole(null);
        }}
      />
    </div>
  );
}
