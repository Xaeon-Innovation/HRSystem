export const EMPLOYEE_ROLES = ["employee", "tenant_admin"] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EMPLOYEE_CSV_FIELD_KEYS = [
  "name",
  "email",
  "phone",
  "role",
  "jobTitle",
  "nationalId",
  "dateOfBirth",
  "address",
  "hireDate",
  "emergencyContactName",
  "emergencyContactPhone",
  "branchCode",
] as const;

export type EmployeeCsvFieldKey = (typeof EMPLOYEE_CSV_FIELD_KEYS)[number];

export type EmployeeDraft = Record<EmployeeCsvFieldKey, string>;

export type EmployeeFieldDef = {
  key: EmployeeCsvFieldKey;
  label: string;
  required: boolean;
  type: "text" | "email" | "tel" | "date" | "select";
  aliases: string[];
  placeholder?: string;
};

export const EMPLOYEE_FIELD_DEFS: EmployeeFieldDef[] = [
  {
    key: "name",
    label: "Full name",
    required: true,
    type: "text",
    aliases: ["name", "full_name", "fullname", "employee_name"],
    placeholder: "Amina Hassan",
  },
  {
    key: "email",
    label: "Email",
    required: true,
    type: "email",
    aliases: ["email", "email_address", "e_mail"],
    placeholder: "amina@company.com",
  },
  {
    key: "phone",
    label: "Phone number",
    required: true,
    type: "tel",
    aliases: ["phone", "phone_number", "mobile", "mobile_number", "cellphone"],
    placeholder: "+20 100 000 0000",
  },
  {
    key: "role",
    label: "Role",
    required: true,
    type: "select",
    aliases: ["role", "user_role"],
    placeholder: "employee",
  },
  {
    key: "jobTitle",
    label: "Job title",
    required: true,
    type: "text",
    aliases: ["jobtitle", "job_title", "title", "position"],
    placeholder: "Field technician",
  },
  {
    key: "nationalId",
    label: "National ID",
    required: true,
    type: "text",
    aliases: [
      "nationalid",
      "national_id",
      "national_id_number",
      "id_number",
      "nid",
      "government_id",
    ],
    placeholder: "29001011234567",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    required: true,
    type: "date",
    aliases: ["dateofbirth", "date_of_birth", "dob", "birth_date", "birthdate"],
  },
  {
    key: "address",
    label: "Address",
    required: true,
    type: "text",
    aliases: ["address", "home_address", "residence"],
    placeholder: "12 Nile St, Cairo",
  },
  {
    key: "hireDate",
    label: "Hire date",
    required: true,
    type: "date",
    aliases: ["hiredate", "hire_date", "start_date", "joining_date", "joined"],
  },
  {
    key: "emergencyContactName",
    label: "Emergency contact name",
    required: false,
    type: "text",
    aliases: [
      "emergencycontactname",
      "emergency_contact_name",
      "emergency_name",
    ],
  },
  {
    key: "emergencyContactPhone",
    label: "Emergency contact phone",
    required: false,
    type: "tel",
    aliases: [
      "emergencycontactphone",
      "emergency_contact_phone",
      "emergency_phone",
    ],
  },
  {
    key: "branchCode",
    label: "Branch code",
    required: false,
    type: "text",
    aliases: ["branchcode", "branch_code", "branch"],
    placeholder: "cairo",
  },
];

export const REQUIRED_EMPLOYEE_FIELDS = EMPLOYEE_FIELD_DEFS.filter(
  (f) => f.required,
).map((f) => f.key);

export const EMPLOYEE_CSV_TEMPLATE = `${EMPLOYEE_CSV_FIELD_KEYS.join(",")}
Amina Hassan,amina@company.com,+201000000001,employee,Field technician,29001011234567,1990-01-15,"12 Nile St, Cairo",2024-03-01,Omar Hassan,+201000000099,cairo
`;

export function emptyEmployeeDraft(): EmployeeDraft {
  return {
    name: "",
    email: "",
    phone: "",
    role: "employee",
    jobTitle: "",
    nationalId: "",
    dateOfBirth: "",
    address: "",
    hireDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    branchCode: "",
  };
}

const HEADER_TO_KEY = new Map<string, EmployeeCsvFieldKey>();
for (const def of EMPLOYEE_FIELD_DEFS) {
  for (const alias of def.aliases) {
    HEADER_TO_KEY.set(alias, def.key);
  }
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** Normalize a date string to YYYY-MM-DD, or null if empty/invalid. */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const y = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    return isValidYmd(y, m, d) ? s : null;
  }
  const dmy = /^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{4})$/.exec(s);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    const y = Number(dmy[3]);
    if (!isValidYmd(y, m, d)) return null;
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  return null;
}

export function normalizeRole(raw: string): EmployeeRole | null {
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!s) return null;
  if (s === "employee" || s === "staff" || s === "worker") return "employee";
  if (
    s === "tenant_admin" ||
    s === "admin" ||
    s === "tenantadmin" ||
    s === "manager"
  ) {
    return "tenant_admin";
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmployeeDraftEvaluation = {
  missing: EmployeeCsvFieldKey[];
  errors: { field: EmployeeCsvFieldKey; message: string }[];
};

export function evaluateEmployeeDraft(
  data: EmployeeDraft,
): EmployeeDraftEvaluation {
  const missing: EmployeeCsvFieldKey[] = [];
  const errors: { field: EmployeeCsvFieldKey; message: string }[] = [];

  for (const def of EMPLOYEE_FIELD_DEFS) {
    const value = data[def.key]?.trim() ?? "";
    if (def.required && !value) {
      missing.push(def.key);
      continue;
    }
    if (!value) continue;

    if (def.key === "email" && !EMAIL_RE.test(value)) {
      errors.push({ field: "email", message: "Invalid email" });
    }
    if (def.key === "role" && !normalizeRole(value)) {
      errors.push({
        field: "role",
        message: "Role must be employee or tenant_admin",
      });
    }
    if (def.key === "phone" && value.length < 6) {
      errors.push({ field: "phone", message: "Phone is too short" });
    }
    if (def.key === "nationalId" && value.length < 5) {
      errors.push({ field: "nationalId", message: "National ID is too short" });
    }
    if (
      (def.key === "dateOfBirth" || def.key === "hireDate") &&
      !normalizeDate(value)
    ) {
      errors.push({
        field: def.key,
        message: "Use YYYY-MM-DD or DD/MM/YYYY",
      });
    }
    if (def.key === "name" && value.length < 2) {
      errors.push({ field: "name", message: "Name is too short" });
    }
    if (def.key === "address" && value.length < 3) {
      errors.push({ field: "address", message: "Address is too short" });
    }
  }

  return { missing, errors };
}

export function isEmployeeDraftComplete(data: EmployeeDraft): boolean {
  const { missing, errors } = evaluateEmployeeDraft(data);
  return missing.length === 0 && errors.length === 0;
}

export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

export type ParsedEmployeeRow = {
  line: number;
  data: EmployeeDraft;
  missing: EmployeeCsvFieldKey[];
  errors: { field: EmployeeCsvFieldKey; message: string }[];
};

export type EmployeeCsvPreview = {
  rows: ParsedEmployeeRow[];
  unknownHeaders: string[];
};

export function parseEmployeeCsv(csv: string): EmployeeCsvPreview {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { rows: [], unknownHeaders: [] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const mapped = rawHeaders.map((h) => HEADER_TO_KEY.get(normalizeHeader(h)));
  const unknownHeaders = rawHeaders.filter((_, i) => mapped[i] == null);

  const rows: ParsedEmployeeRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.every((c) => !c)) continue;
    const data = emptyEmployeeDraft();
    for (let c = 0; c < mapped.length; c++) {
      const key = mapped[c];
      if (!key) continue;
      data[key] = cols[c] ?? "";
    }
    if (data.role) {
      const role = normalizeRole(data.role);
      if (role) data.role = role;
    } else {
      data.role = "employee";
    }
    if (data.dateOfBirth) {
      data.dateOfBirth = normalizeDate(data.dateOfBirth) ?? data.dateOfBirth;
    }
    if (data.hireDate) {
      data.hireDate = normalizeDate(data.hireDate) ?? data.hireDate;
    }
    const evaluation = evaluateEmployeeDraft(data);
    rows.push({
      line: i + 1,
      data,
      missing: evaluation.missing,
      errors: evaluation.errors,
    });
  }

  return { rows, unknownHeaders };
}

export function draftToCreatePayload(data: EmployeeDraft) {
  const role = normalizeRole(data.role) ?? "employee";
  return {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    role,
    jobTitle: data.jobTitle.trim(),
    nationalId: data.nationalId.trim(),
    dateOfBirth: normalizeDate(data.dateOfBirth) ?? data.dateOfBirth.trim(),
    address: data.address.trim(),
    hireDate: normalizeDate(data.hireDate) ?? data.hireDate.trim(),
    emergencyContactName: data.emergencyContactName.trim() || null,
    emergencyContactPhone: data.emergencyContactPhone.trim() || null,
    branchCode: data.branchCode.trim() || null,
  };
}
