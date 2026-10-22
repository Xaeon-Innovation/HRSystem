"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Car,
  Download,
  MapPin,
  Plus,
  Search,
  Settings2,
  Upload,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { LoginCredentialsPanel } from "@/components/employees/login-credentials";
import { EmployeeHrPanel } from "@/components/employees/employee-hr-panel";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  PersonCell,
  PillSelect,
  Segmented,
  StatusText,
  Steps,
} from "@/components/elevora";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableWrap,
} from "@/components/ui/table";
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
  type PresenceMode,
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
  presenceMode?: PresenceMode;
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

/** PillSelect face with a native <select> laid over it (works on touch). */
function FilterPill({
  label,
  ariaLabel,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <PillSelect label={label} className="py-1.5">
      <select
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </PillSelect>
  );
}

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

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">{title}</SheetDescription>
          )}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export default function EmployeesPage() {
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
  const [branchFilter, setBranchFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [presenceFilter, setPresenceFilter] = useState<
    "all" | PresenceMode
  >("all");
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
  const [createPresenceMode, setCreatePresenceMode] =
    useState<PresenceMode>("fixed_zone");
  const [editPresenceMode, setEditPresenceMode] =
    useState<PresenceMode>("fixed_zone");
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
        presenceMode: e.presenceMode ?? "fixed_zone",
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
    return org.find((b) => b.id === id)?.name ?? "-";
  }

  function managerNameOf(id: string | null | undefined) {
    if (!id) return "-";
    return employees.find((e) => e.id === id)?.name ?? "-";
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
    setEditPresenceMode(emp.presenceMode ?? "fixed_zone");
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
    const zone =
      editPresenceMode === "mobile"
        ? ({ ok: true as const, lat: null, lng: null, radius: null })
        : parseZoneFields();
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
          presenceMode: editPresenceMode,
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
          presenceMode: createPresenceMode,
          ...(createPresenceMode === "mobile"
            ? {
                geofenceLat: null,
                geofenceLng: null,
                geofenceRadiusMeters: null,
              }
            : {}),
        }),
      });
      setForm(emptyEmployeeDraft());
      setBranchId("");
      setCreateManagerId("");
      setCreateJobRoleIds([]);
      setCreateSystemRoles([]);
      setCreatePresenceMode("fixed_zone");
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

  const visibleEmployees = useMemo(
    () =>
      employees.filter((emp) => {
        if (branchFilter && emp.branchId !== branchFilter) return false;
        if (
          roleFilter &&
          !(emp.jobRoles ?? []).some((r) => r.id === roleFilter)
        ) {
          return false;
        }
        if (statusFilter && emp.status !== statusFilter) return false;
        if (
          presenceFilter !== "all" &&
          (emp.presenceMode ?? "fixed_zone") !== presenceFilter
        ) {
          return false;
        }
        return true;
      }),
    [employees, branchFilter, roleFilter, statusFilter, presenceFilter],
  );

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
      <PageHeader
        title={t("Employees")}
        subtitle={
          rosterReady
            ? `${employees.length} ${employees.length === 1 ? "person" : "people"} · ${org.length} ${org.length === 1 ? "branch" : "branches"}`
            : t("Roster first. Job roles and branches live under Org setup.")
        }
        actions={
          <>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/settings/org">
                <Settings2 className="h-4 w-4" />
                {t("Org setup")}
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => openAdd("csv")}
            >
              <Upload className="h-4 w-4" />
              {t("Import CSV")}
            </Button>
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
              <Download className="h-4 w-4" />
              {t("Export CSV")}
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => openAdd("one")}>
              <Plus className="h-4 w-4" />
              {t("Add employee")}
            </Button>
          </>
        }
      />

      {pageError ? <Notice tone="warn">{pageError}</Notice> : null}
      {success ? <Notice tone="accent">{success}</Notice> : null}
      {createdCreds.length > 0 ? (
        <Notice tone="warn" className="space-y-1">
          <p className="font-semibold">{t("Temporary passwords")}</p>
          <p className="text-ink-muted">
            {t("Share these once. Employees should change them after first sign-in.")}</p>
          {createdCreds.map((c) => (
            <p key={c.id} className="break-all">
              <span className="font-medium">{c.name}</span> ({c.email}):{" "}
              <code className="rounded-sm bg-surface px-1.5 py-0.5">
                {c.temporaryPassword}
              </code>
            </p>
          ))}
        </Notice>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full min-w-0 sm:max-w-[280px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <Input
            className="h-9 w-full ps-9"
            placeholder={t("Search name, email or phone")}
            aria-label={t("Search employees")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load(q);
            }}
            disabled={!rosterReady}
          />
        </div>
        <FilterPill
          ariaLabel={t("Branch")}
          label={
            branchFilter ? branchNameOf(branchFilter) : t("All branches")
          }
          value={branchFilter}
          onChange={setBranchFilter}
          disabled={!rosterReady}
          options={[
            { value: "", label: t("All branches") },
            ...org.map((b) => ({ value: b.id, label: b.name })),
          ]}
        />
        <FilterPill
          ariaLabel={t("Job role")}
          label={
            roleFilter
              ? (jobRoles.find((r) => r.id === roleFilter)?.name ??
                t("Any role"))
              : t("Any role")
          }
          value={roleFilter}
          onChange={setRoleFilter}
          disabled={!rosterReady}
          options={[
            { value: "", label: t("Any role") },
            ...jobRoles.map((r) => ({ value: r.id, label: r.name })),
          ]}
        />
        <FilterPill
          ariaLabel={t("Status")}
          label={
            statusFilter === "active"
              ? `${t("Status")}: ${t("Active")}`
              : statusFilter === "inactive"
                ? `${t("Status")}: ${t("Inactive")}`
                : `${t("Status")}: ${t("All")}`
          }
          value={statusFilter}
          onChange={setStatusFilter}
          disabled={!rosterReady}
          options={[
            { value: "", label: t("All") },
            { value: "active", label: t("Active") },
            { value: "inactive", label: t("Inactive") },
          ]}
        />
        <Segmented
          aria-label={t("Presence mode")}
          className="max-w-full overflow-x-auto"
          value={presenceFilter}
          onChange={setPresenceFilter}
          options={[
            { value: "all", label: t("All") },
            { value: "fixed_zone", label: t("Fixed zone") },
            { value: "mobile", label: t("Mobile") },
          ]}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-line bg-surface p-0">
        {!rosterReady ? (
          <div className="px-4 pb-6 pt-2">
            <PageSkeleton dense />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t("No employees yet")}
            subtitle={t("Add one person or import a CSV to build the roster.")}
            action={
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" onClick={() => openAdd("one")}>
                  {t("Add employee")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openAdd("csv")}
                >
                  {t("Import CSV")}
                </Button>
              </div>
            }
          />
        ) : visibleEmployees.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title={t("No matching employees")}
            subtitle={t("Try a different search or clear a filter.")}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBranchFilter("");
                  setRoleFilter("");
                  setStatusFilter("");
                  setPresenceFilter("all");
                }}
              >
                {t("Clear filters")}
              </Button>
            }
          />
        ) : (
          <DataTableWrap>
            <DataTable className="min-w-[860px]">
              <DataTableHead>
                <DataTableRow className="hover:bg-transparent">
                  <DataTableHeaderCell>{t("Employee")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Title")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Branch")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Manager")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Access")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Presence")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Status")}</DataTableHeaderCell>
                  <DataTableHeaderCell>
                    <span className="sr-only">{t("Actions")}</span>
                  </DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {visibleEmployees.map((emp) => {
                  const roles = emp.jobRoles ?? [];
                  const mobile =
                    (emp.presenceMode ?? "fixed_zone") === "mobile";
                  const complete = profileComplete(emp);
                  return (
                    <DataTableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => openEditor(emp)}
                    >
                      <DataTableCell>
                        <PersonCell
                          name={emp.name}
                          subtitle={emp.email}
                          avatar={
                            <UserAvatar
                              name={emp.name}
                              avatarUrl={emp.avatarUrl}
                              size="sm"
                            />
                          }
                        />
                      </DataTableCell>
                      <DataTableCell>
                        <div className="text-sm text-ink-2">
                          {emp.jobTitle ?? "—"}
                        </div>
                        {roles.length > 0 ? (
                          <div className="max-w-[14rem] truncate text-xs text-ink-muted">
                            {roles.map((r) => r.name).join(", ")}
                          </div>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell className="text-sm text-ink-2">
                        {branchNameOf(emp.branchId)}
                      </DataTableCell>
                      <DataTableCell className="text-sm text-ink-muted">
                        {managerNameOf(emp.managerId)}
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {emp.role === "tenant_admin" ? (
                            <Chip tone="ink">{t("Admin")}</Chip>
                          ) : (
                            <Chip>
                              {t(ROLE_LABEL[emp.role] ?? emp.role)}
                            </Chip>
                          )}
                          {emp.role !== "tenant_admin"
                            ? (emp.systemModuleRoles ?? []).map((r) => (
                                <Chip key={r} tone="ok">
                                  {SYSTEM_MODULE_ROLE_LABELS[r] ?? r}
                                </Chip>
                              ))
                            : null}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-ink-2">
                          {mobile ? (
                            <Car className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <MapPin className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {mobile ? t("Mobile") : t("Fixed zone")}
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-col items-start gap-0.5">
                          <StatusText
                            status={
                              emp.status === "inactive"
                                ? t("Inactive")
                                : t("Active")
                            }
                          />
                          {!complete ? (
                            <span className="text-[11px] font-medium text-warn">
                              {t("Incomplete")}
                            </span>
                          ) : null}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div
                          className="flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEditor(emp)}
                          >
                            {complete ? t("Open") : t("Complete")}
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DataTableWrap>
        )}
      </section>

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
        <Segmented
          aria-label={t("Add mode")}
          className="mb-4"
          value={addMode}
          onChange={setAddMode}
          options={[
            { value: "one", label: t("One person") },
            { value: "csv", label: t("Import CSV") },
          ]}
        />
        {dialogError && addOpen ? (
          <Notice tone="warn" className="mb-3">
            {dialogError}
          </Notice>
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
            <div className="space-y-1 md:col-span-2">
              <Label>{t("Presence mode")}</Label>
              <select
                className={selectClass}
                value={createPresenceMode}
                onChange={(e) =>
                  setCreatePresenceMode(
                    e.target.value === "mobile" ? "mobile" : "fixed_zone",
                  )
                }
              >
                <option value="fixed_zone">{t("Fixed work zone")}</option>
                <option value="mobile">
                  {t("Mobile (no zone, for example drivers)")}
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                {createPresenceMode === "mobile"
                  ? t("Mobile employees clock in anywhere; no geofence is stored.")
                  : t("Set a work zone later on the map or in this profile.")}
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end md:col-span-2">
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
            <Steps
              steps={[
                { id: "upload", label: t("Upload") },
                { id: "review", label: t("Review") },
                { id: "commit", label: t("Commit") },
              ]}
              currentIndex={
                importing ? 2 : reviewRows ? 1 : 0
              }
            />
            <div className="rounded-xl border-[1.5px] border-dashed border-line-strong p-5 text-center">
              <span className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-[9px] bg-surface-2 text-ink-2">
                <Upload className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-ink">
                {t("Drop a CSV or paste rows")}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {csvFileName
                  ? `${csvFileName}${reviewRows ? ` · ${reviewRows.length} ${t("rows detected")}` : ""}`
                  : t("Upload a file or paste CSV below.")}
              </p>
              <label className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2 sm:w-auto">
                {t("Upload CSV")}
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
            <p className="text-xs text-ink-muted">
              {t("Required columns: name, email, phone, role (employee or tenant_admin), jobTitle, nationalId, dateOfBirth, address, hireDate. Optional: emergencyContactName, emergencyContactPhone, branchCode.")}</p>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-ink hover:underline"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4" aria-hidden />
              {t("Download template")}
            </button>
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
                  <Notice tone="warn">
                    {incompleteCount} of {reviewRows.length} {t("row")}{reviewRows.length === 1 ? "" : "s"}{" "}
                    {incompleteCount === 1 ? "is" : "are"} {t("missing required information.")}
                  </Notice>
                ) : (
                  <Notice tone="accent">
                    {t("All")}{reviewRows.length} {t("row")}{reviewRows.length === 1 ? "" : "s"} {t("look complete.")}
                  </Notice>
                )}
                <div className="space-y-3">
                  {reviewRows.map((row, index) => {
                    const incomplete = !isEmployeeDraftComplete(row.data);
                    return (
                      <div
                        key={`${row.line}-${index}`}
                        className={`rounded-sm border p-3 ${
                          incomplete
                            ? "border-warn/40 bg-warn/10"
                            : "border-line"
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
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
        description={t("Update sign-in credentials, personal details, access, roles, branch, and work zone.")}
      >
        {editing ? (
          <div className="space-y-4">
            {dialogError && editId ? (
              <Notice tone="warn">{dialogError}</Notice>
            ) : null}
            {!isEmployeeDraftComplete(editDraft) ? (
              <Notice tone="warn">
                {t("Fill the highlighted fields to complete this profile.")}
              </Notice>
            ) : null}
            <LoginCredentialsPanel
              employeeId={editing.id}
              employeeName={editing.name}
            />
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
              <div className="space-y-1 md:col-span-2">
                <Label>{t("Presence mode")}</Label>
                <select
                  className={selectClass}
                  value={editPresenceMode}
                  onChange={(e) =>
                    setEditPresenceMode(
                      e.target.value === "mobile" ? "mobile" : "fixed_zone",
                    )
                  }
                >
                  <option value="fixed_zone">{t("Fixed work zone")}</option>
                  <option value="mobile">
                    {t("Mobile (no zone, for example drivers)")}
                  </option>
                </select>
              </div>
            </div>
            {editPresenceMode === "mobile" ? (
              <div className="rounded-sm border border-line bg-surface-2 p-3">
                <p className="text-sm font-medium">{t("Work zone")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Mobile employees have no work zone. Saving clears any stored geofence.")}
                </p>
              </div>
            ) : (
            <div className="rounded-sm border border-line bg-surface-2 p-3">
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
            )}
            <EmployeeHrPanel
              employeeId={editing.id}
              jobRoles={editing.jobRoles ?? []}
            />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/app/analytics/employees/${editing.id}`}>
                  {t("Analytics")}
                </Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={editSaving}
                onClick={closeEditor}
              >
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
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
