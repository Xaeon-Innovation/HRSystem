"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Plus, Search, Settings2, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { OrgSetupPanel } from "@/components/employees/org-setup-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  EMPLOYEE_CSV_TEMPLATE,
  EMPLOYEE_FIELD_DEFS,
  SYSTEM_MODULE_ROLES,
  SYSTEM_MODULE_ROLE_LABELS,
  draftToCreatePayload,
  emptyEmployeeDraft,
  evaluateEmployeeDraft,
  isEmployeeDraftComplete,
  parseEmployeeCsv,
  type EmployeeCsvFieldKey,
  type EmployeeDraft,
  type ParsedEmployeeRow,
  type SystemModuleRole,
} from "@hr/shared";
import { t } from "@/i18n";

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
  systemModuleRoles: SystemModuleRole[];
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
  managerId: string | null;
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
  employee: "Employee",
  tenant_admin: "Admin",
};

const PILL =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

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
        {t("Create job roles in the Job roles section, then assign them here.")}</p>
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

function SystemModuleRolePicker({
  selected,
  onChange,
  disabled,
}: {
  selected: SystemModuleRole[];
  onChange: (roles: SystemModuleRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SYSTEM_MODULE_ROLES.map((role) => {
        const on = selected.includes(role);
        return (
          <label
            key={role}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            } ${
              on
                ? "border-primary bg-primary/10 text-foreground"
                : "border-input bg-background text-muted-foreground"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={on}
              disabled={disabled}
              onChange={() =>
                onChange(
                  on
                    ? selected.filter((id) => id !== role)
                    : [...selected, role],
                )
              }
            />
            {SYSTEM_MODULE_ROLE_LABELS[role]}
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
          {field.key === "role" ? t("Access") : field.label}
          {field.required ? " *" : ""}
        </Label>
        {field.key === "role" ? (
          <select
            className={selectClass}
            value={draft.role || "employee"}
            onChange={(e) => onChange("role", e.target.value)}
          >
            <option value="employee">{t("Employee")}</option>
            <option value="tenant_admin">{t("Admin")}</option>
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

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadRosterCsv(
  rows: Array<{
    name: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    status: string;
    branch: string;
  }>,
) {
  const header = ["name", "email", "phone", "jobTitle", "status", "branch"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.name),
        csvEscape(r.email),
        csvEscape(r.phone ?? ""),
        csvEscape(r.jobTitle ?? ""),
        csvEscape(r.status),
        csvEscape(r.branch),
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "employees-roster.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        PILL,
        "uppercase tracking-wide",
        active
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800"
          : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
      )}
    >
      {status}
    </span>
  );
}

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] flex max-h-[min(90dvh,46rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-card shadow-2xl",
            wide
              ? "w-[min(52rem,calc(100vw-2rem))]"
              : "w-[min(42rem,calc(100vw-2rem))]",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b px-5 py-4 pr-12">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">
                  {title}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="h-4 w-4" />
              <span className="sr-only">{t("Close")}</span>
            </DialogPrimitive.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default function EmployeesPage() {
  const redesign = useUiRedesign();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rosterReady, setRosterReady] = useState(false);
  const [org, setOrg] = useState<Branch[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [createJobRoleIds, setCreateJobRoleIds] = useState<string[]>([]);
  const [editJobRoleIds, setEditJobRoleIds] = useState<string[]>([]);
  const [createSystemRoles, setCreateSystemRoles] = useState<SystemModuleRole[]>(
    [],
  );
  const [editSystemRoles, setEditSystemRoles] = useState<SystemModuleRole[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<EmployeeDraft>(emptyEmployeeDraft);
  const [branchId, setBranchId] = useState("");
  const [createManagerId, setCreateManagerId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [reviewRows, setReviewRows] = useState<ParsedEmployeeRow[] | null>(
    null,
  );
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [createdCreds, setCreatedCreds] = useState<CreatedImport[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"one" | "csv">("one");
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
  const [editManagerId, setEditManagerId] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editSaving, setEditSaving] = useState(false);

  const editing = employees.find((e) => e.id === editId) ?? null;
  const dialogError = addOpen || editId ? error : null;
  const pageError = addOpen || editId ? null : error;

  async function load(search = q) {
    const [empData, branchData, roleData] = await Promise.all([
      api<{ employees: Employee[] }>(
        `/v1/employees${search ? `?q=${encodeURIComponent(search)}` : ""}`,
      ),
      api<{ branches: Branch[] }>("/v1/branches"),
      api<{ jobRoles: JobRole[] }>("/v1/job-roles"),
    ]);
    setEmployees(
      empData.employees.map((e) => ({
        ...e,
        jobRoles: e.jobRoles ?? [],
        systemModuleRoles: e.systemModuleRoles ?? [],
      })),
    );
    setOrg(branchData.branches);
    setJobRoles(roleData.jobRoles);
    setRosterReady(true);
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setRosterReady(true));
  }, []);

  function branchNameOf(id: string | null) {
    if (!id) return "Unassigned";
    return org.find((b) => b.id === id)?.name ?? "—";
  }

  function managerNameOf(id: string | null | undefined) {
    if (!id) return "—";
    return employees.find((e) => e.id === id)?.name ?? "—";
  }

  function managerOptions(excludeId?: string | null) {
    return employees.filter((e) => e.id !== excludeId && e.status !== "inactive");
  }

  function setFormField(key: EmployeeCsvFieldKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd(mode: "one" | "csv" = "one") {
    setEditId(null);
    setAddMode(mode);
    setAddOpen(true);
    setCreateManagerId("");
    setError(null);
  }

  function openEditor(emp: Employee) {
    setAddOpen(false);
    setEditId(emp.id);
    setEditDraft(employeeToDraft(emp));
    setEditBranchId(emp.branchId ?? "");
    setEditManagerId(emp.managerId ?? "");
    setEditStatus(emp.status === "inactive" ? "inactive" : "active");
    setEditJobRoleIds((emp.jobRoles ?? []).map((r) => r.id));
    setEditSystemRoles(emp.systemModuleRoles ?? []);
    setZoneLat(emp.geofenceLat != null ? String(emp.geofenceLat) : "");
    setZoneLng(emp.geofenceLng != null ? String(emp.geofenceLng) : "");
    setZoneRadius(
      String(emp.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS),
    );
    setError(null);
  }

  function closeEditor() {
    if (editSaving || zoneBusy) return;
    setEditId(null);
  }

  function setEditField(key: EmployeeCsvFieldKey, value: string) {
    setEditDraft((prev) => ({ ...prev, [key]: value }));
  }

  function parseZoneFields():
    | { ok: true; lat: number | null; lng: number | null; radius: number | null }
    | { ok: false; message: string } {
    const latS = zoneLat.trim();
    const lngS = zoneLng.trim();
    const radS = zoneRadius.trim();
    if (!latS && !lngS) {
      return { ok: true, lat: null, lng: null, radius: null };
    }
    if (!latS || !lngS || !radS) {
      return { ok: false, message: t("Enter latitude, longitude, and radius") };
    }
    const lat = Number(latS);
    const lng = Number(lngS);
    const radius = Math.round(Number(radS));
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isFinite(radius)
    ) {
      return { ok: false, message: t("Enter valid lat, lng, and radius") };
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        ok: false,
        message: t("Latitude must be -90…90 and longitude -180…180"),
      };
    }
    if (lat === 0 && lng === 0) {
      return {
        ok: false,
        message: t("Set a real center (0, 0 is not a valid work zone)"),
      };
    }
    if (
      radius < MIN_GEOFENCE_RADIUS_METERS ||
      radius > MAX_GEOFENCE_RADIUS_METERS
    ) {
      return {
        ok: false,
        message: `Radius must be between ${MIN_GEOFENCE_RADIUS_METERS} and ${MAX_GEOFENCE_RADIUS_METERS} meters`,
      };
    }
    return { ok: true, lat, lng, radius };
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
    const zone = parseZoneFields();
    if (!zone.ok) {
      setError(zone.message);
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
          managerId: editManagerId || null,
          status: editStatus,
          jobRoleIds: editJobRoleIds,
          systemModuleRoles:
            payload.role === "tenant_admin" ? [] : editSystemRoles,
          geofenceLat: zone.lat,
          geofenceLng: zone.lng,
          geofenceRadiusMeters: zone.radius,
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

  async function clearZoneFields() {
    setZoneLat("");
    setZoneLng("");
    setZoneRadius(String(DEFAULT_GEOFENCE_RADIUS_METERS));
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
      await clearZoneFields();
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
          managerId: createManagerId || null,
          jobRoleIds: createJobRoleIds,
          systemModuleRoles:
            payload.role === "tenant_admin" ? [] : createSystemRoles,
        }),
      });
      setForm(emptyEmployeeDraft());
      setBranchId("");
      setCreateManagerId("");
      setCreateJobRoleIds([]);
      setCreateSystemRoles([]);
      setAddOpen(false);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
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
        setAddOpen(false);
        await load();
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Employees")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {redesign
              ? t("Roster first. Job roles and branches live under Org setup.")
              : t("Roster, access, and work zones — one table, less clutter.")}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {redesign ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/settings/org">
                <Settings2 className="h-4 w-4" />
                {t("Org setup")}</Link>
            </Button>
          ) : null}
          {redesign ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openAdd("csv")}
            >
              {t("Import CSV")}</Button>
          ) : null}
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!rosterReady || employees.length === 0}
            onClick={() =>
              downloadRosterCsv(
                employees.map((emp) => ({
                  name: emp.name,
                  email: emp.email,
                  phone: emp.phone,
                  jobTitle: emp.jobTitle,
                  status: emp.status,
                  branch: branchNameOf(emp.branchId),
                })),
              )
            }
          >
            {t("Export CSV")}</Button>
          <Button className="w-full sm:w-auto" onClick={() => openAdd("one")}>
            <Plus className="h-4 w-4" />
            {t("Add employee")}</Button>
        </div>
      </div>

      {pageError ? <p className="text-sm text-destructive">{pageError}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      {createdCreds.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Temporary passwords")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              {t("Share these once. Employees should change them after first sign-in.")}</p>
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

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("Roster")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {!rosterReady
                  ? t("Loading…")
                  : `${employees.length} ${employees.length === 1 ? "person" : "people"}`}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative min-w-0 flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9 w-full pl-8"
                  placeholder={t("Search name, email, phone…")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void load(q);
                  }}
                  disabled={!rosterReady}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => load(q)}
                disabled={!rosterReady}
              >
                {t("Search")}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {!rosterReady ? (
            <div className="px-4 pb-6 pt-2">
              <PageSkeleton dense />
            </div>
          ) : employees.length === 0 ? (
            <div className="px-4 pb-6 pt-2 text-center">
              <p className="text-sm font-medium">{t("No employees yet")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Add one person or import a CSV to build the roster.")}</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button size="sm" onClick={() => openAdd("one")}>
                  {t("Add employee")}</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAdd("csv")}
                >
                  {t("Import CSV")}</Button>
              </div>
            </div>
          ) : (
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-y bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("Employee")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Title")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Roles")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Branch")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Manager")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Access")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                  <th className="px-4 py-2.5 font-medium">
                    <span className="sr-only">{t("Actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const roles = emp.jobRoles ?? [];
                  const shown = roles.slice(0, 2);
                  const extra = roles.length - shown.length;
                  return (
                    <tr
                      key={emp.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-accent/30"
                      onClick={() => openEditor(emp)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            name={emp.name}
                            avatarUrl={emp.avatarUrl}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{emp.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {emp.email}
                              {emp.phone ? ` · ${emp.phone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {emp.jobTitle ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        {roles.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {shown.map((role) => (
                              <span
                                key={role.id}
                                className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                              >
                                {role.name}
                              </span>
                            ))}
                            {extra > 0 ? (
                              <span className="text-[11px] text-muted-foreground">
                                +{extra}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {branchNameOf(emp.branchId)}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {managerNameOf(emp.managerId)}
                      </td>
                      <td className="px-3 py-3">
                        {ROLE_LABEL[emp.role] ?? emp.role}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill status={emp.status} />
                          {!profileComplete(emp) ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                              {t("Incomplete")}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(emp)}
                          >
                            {profileComplete(emp) ? t("Edit") : t("Complete")}
                          </Button>
                          <a
                            href={`/app/analytics/employees/${emp.id}`}
                            className="inline-flex h-8 items-center rounded-md px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            {t("Analytics")}</a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {!redesign ? (
        <OrgSetupPanel layout="details" onChanged={() => void load()} />
      ) : null}

      <Modal
        open={addOpen}
        onOpenChange={(open) => {
          if (!open && (saving || importing)) return;
          setAddOpen(open);
          if (open) setError(null);
        }}
        wide
        title={t("Add employee")}
        description="Create one person, or import a roster from CSV."
      >
        <div className="mb-4 inline-flex rounded-lg bg-secondary p-1 text-sm">
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              addMode === "one"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setAddMode("one")}
          >
            {t("One person")}</button>
          <button
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              addMode === "csv"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
            onClick={() => setAddMode("csv")}
          >
            {t("Import CSV")}</button>
        </div>
        {dialogError && addOpen ? (
          <p className="mb-3 text-sm text-destructive">{dialogError}</p>
        ) : null}

        {addMode === "one" ? (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={createEmployee}
          >
            <ProfileFieldGrid draft={form} onChange={setFormField} />
            <div className="space-y-1">
              <Label>{t("Branch")}</Label>
              <select
                className={selectClass}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">{t("Unassigned")}</option>
                {org.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>{t("Manager")}</Label>
              <select
                className={selectClass}
                value={createManagerId}
                onChange={(e) => setCreateManagerId(e.target.value)}
              >
                <option value="">{t("No manager")}</option>
                {managerOptions().map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t("Job roles")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("Optional. Pick every function this person covers.")}</p>
              <JobRolePicker
                roles={jobRoles}
                selectedIds={createJobRoleIds}
                onChange={setCreateJobRoleIds}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t("System control roles")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("Optional. Let this employee control specific modules without making them a full admin.")}</p>
              <SystemModuleRolePicker
                selected={
                  form.role === "tenant_admin" ? [] : createSystemRoles
                }
                disabled={form.role === "tenant_admin"}
                onChange={setCreateSystemRoles}
              />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setAddOpen(false)}
              >
                {t("Cancel")}</Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("Creating…") : t("Create employee")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("Required columns: name, email, phone, role (employee or tenant_admin), jobTitle, nationalId, dateOfBirth, address, hireDate. Optional: emergencyContactName, emergencyContactPhone, branchCode.")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
              >
                {t("Download template")}</Button>
              <label className="inline-flex h-10 cursor-pointer items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
                {t("Upload CSV")}<input
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
              <p className="text-xs text-muted-foreground">
                {t("File:")}{csvFileName}
              </p>
            ) : null}
            <textarea
              className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm"
              value={csvText}
              placeholder={t("Paste CSV here, or upload a file…")}
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
                    {incompleteCount} of {reviewRows.length} {t("row")}{reviewRows.length === 1 ? "" : "s"}{" "}
                    {incompleteCount === 1 ? "is" : "are"} {t("missing required information.")}</p>
                ) : (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                    {t("All")}{reviewRows.length} {t("row")}{reviewRows.length === 1 ? "" : "s"} {t("look complete.")}</p>
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
                            {t("Row")}{row.line}
                            {row.data.name ? ` · ${row.data.name}` : ""}
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
                            {t("Remove")}</Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {EMPLOYEE_FIELD_DEFS.map((field) => {
                            const isMissing = row.missing.includes(field.key);
                            const fieldErr = row.errors.find(
                              (e) => e.field === field.key,
                            );
                            return (
                              <div key={field.key} className="space-y-1">
                                <Label className="text-xs">
                                  {field.key === "role"
                                    ? t("Access")
                                    : field.label}
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
                                    <option value="employee">{t("Employee")}</option>
                                    <option value="tenant_admin">{t("Admin")}</option>
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
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importing}
                    onClick={() => setAddOpen(false)}
                  >
                    {t("Cancel")}</Button>
                  <Button
                    type="button"
                    disabled={
                      importing || incompleteCount > 0 || !reviewRows.length
                    }
                    onClick={() => void importReviewed()}
                  >
                    {importing
                      ? t("Adding…")
                      : incompleteCount > 0
                        ? t("Fill missing info to continue")
                        : `Add ${reviewRows.length} employee${reviewRows.length === 1 ? "" : "s"}`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                >
                  {t("Cancel")}</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(editId && editing)}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
        wide
        title={
          editing
            ? profileComplete(editing)
              ? `Edit ${editing.name}`
              : `Complete ${editing.name}`
            : "Edit employee"
        }
        description="Update personal details, access, roles, branch, and work zone."
      >
        {editing ? (
          <div className="space-y-4">
            {dialogError && editId ? (
              <p className="text-sm text-destructive">{dialogError}</p>
            ) : null}
            {!isEmployeeDraftComplete(editDraft) ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                {t("Fill the highlighted fields to complete this profile.")}</p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <ProfileFieldGrid draft={editDraft} onChange={setEditField} />
              <div className="space-y-1">
                <Label>{t("Branch")}</Label>
                <select
                  className={selectClass}
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                >
                  <option value="">{t("Unassigned")}</option>
                  {org.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("Manager")}</Label>
                <select
                  className={selectClass}
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                >
                  <option value="">{t("No manager")}</option>
                  {managerOptions(editId).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>{t("Status")}</Label>
                <select
                  className={selectClass}
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value === "inactive" ? "inactive" : "active",
                    )
                  }
                >
                  <option value="active">{t("Active")}</option>
                  <option value="inactive">{t("Inactive")}</option>
                </select>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>{t("Job roles")}</Label>
                <JobRolePicker
                  roles={jobRoles}
                  selectedIds={editJobRoleIds}
                  onChange={setEditJobRoleIds}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>{t("System control roles")}</Label>
                <SystemModuleRolePicker
                  selected={
                    editDraft.role === "tenant_admin" ? [] : editSystemRoles
                  }
                  disabled={editDraft.role === "tenant_admin"}
                  onChange={setEditSystemRoles}
                />
              </div>
            </div>
            <div className="rounded-lg border bg-secondary/30 p-3">
              <p className="mb-2 text-sm font-medium">{t("Work zone")}</p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("Clock-in/out must happen inside this radius. Leave blank for no zone.")}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("Latitude")}</Label>
                  <Input
                    value={zoneLat}
                    onChange={(e) => setZoneLat(e.target.value)}
                    placeholder="30.0444"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Longitude")}</Label>
                  <Input
                    value={zoneLng}
                    onChange={(e) => setZoneLng(e.target.value)}
                    placeholder="31.2357"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("Radius (m)")}</Label>
                  <Input
                    type="number"
                    min={MIN_GEOFENCE_RADIUS_METERS}
                    max={MAX_GEOFENCE_RADIUS_METERS}
                    value={zoneRadius}
                    onChange={(e) => setZoneRadius(e.target.value)}
                  />
                </div>
              </div>
              {editing.geofenceRadiusMeters != null ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  disabled={zoneBusy || editSaving}
                  onClick={() => void clearZone(editing.id)}
                >
                  {zoneBusy ? t("Clearing…") : t("Clear zone")}
                </Button>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={editSaving}
                onClick={closeEditor}
              >
                {t("Cancel")}</Button>
              <Button
                type="button"
                disabled={editSaving}
                onClick={() => void saveEditor(editing.id)}
              >
                {editSaving
                  ? t("Saving…")
                  : profileComplete(editing)
                    ? t("Save changes")
                    : t("Save and complete")}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
