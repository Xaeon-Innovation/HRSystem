import type { ParsedResume } from "./types";

export const DEFAULT_SKILL_LEXICON = [
  "sales",
  "b2b",
  "crm",
  "negotiation",
  "discovery",
  "forecasting",
  "arabic",
  "english",
  "excel",
  "dispatch",
  "operations",
  "logistics",
  "coordination",
  "planning",
  "sla",
  "driving",
  "navigation",
  "hris",
  "onboarding",
  "payroll",
  "recruiting",
  "recruitment",
  "leave",
  "admin",
  "filing",
  "scheduling",
  "communication",
  "customer",
  "saas",
  "demos",
  "pipeline",
];

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_RE = /(?:\+|00)?(?:\d[\s().-]?){8,16}\d/;
const YEARS_RE =
  /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?/i;
const EDUCATION_RE =
  /\b((?:b\.?a\.?|b\.?sc\.?|m\.?b\.?a\.?|m\.?sc\.?|ph\.?d\.?|bachelor|master|diploma|university|faculty)[^\n]{0,80})/i;

export type ExtractedResumeFields = {
  fullName: string;
  email: string;
  phone: string;
  skills: string[];
  yearsOfExperience: number | null;
  education: string | null;
  summary: string | null;
};

export type ResumeParseResult = {
  fields: ExtractedResumeFields;
  warnings: string[];
  rawText: string;
};

export function tokenizeJobText(...chunks: Array<string | null | undefined>): string[] {
  const text = chunks.filter(Boolean).join(" ").toLowerCase();
  return text
    .split(/[^a-z0-9+#./]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

export function extractFieldsFromText(
  rawText: string,
  extraSkills: string[] = [],
): ResumeParseResult {
  const warnings: string[] = [];
  const text = rawText.replace(/\r/g, "").trim();
  if (!text) {
    return {
      fields: emptyFields(),
      warnings: ["Couldn’t read any text from this file. Fill the form manually."],
      rawText: "",
    };
  }

  const emailMatch = text.match(EMAIL_RE);
  const phoneMatch = text.match(PHONE_RE);
  const yearsMatch = text.match(YEARS_RE);
  const educationMatch = text.match(EDUCATION_RE);

  const fullName = inferName(text, emailMatch?.[0] ?? null);
  const email = emailMatch?.[0] ?? "";
  const phone = normalizePhone(phoneMatch?.[0] ?? "");
  const years = yearsMatch ? Number(yearsMatch[1]) : null;
  const education = educationMatch?.[1]?.trim() ?? null;
  const skills = extractSkills(text, extraSkills);

  if (!email) warnings.push("No email found — add it before saving.");
  if (!phone) warnings.push("No phone number found — add it if you have one.");
  if (!fullName) warnings.push("Name was unclear — check the full name field.");
  if (skills.length === 0) warnings.push("No skills detected — type a few comma-separated skills.");
  if (text.length < 80) {
    warnings.push("Very little text extracted. This may be a scanned CV — fill fields manually.");
  }

  const summary = `Extracted from CV${fullName ? ` for ${fullName}` : ""}. Review before saving.`;

  return {
    fields: {
      fullName,
      email,
      phone,
      skills,
      yearsOfExperience: Number.isFinite(years) ? years : null,
      education,
      summary,
    },
    warnings,
    rawText: text,
  };
}

export function toParsedResume(fields: ExtractedResumeFields): ParsedResume {
  return {
    fullName: fields.fullName || null,
    email: fields.email || null,
    phone: fields.phone || null,
    skills: fields.skills,
    yearsOfExperience: fields.yearsOfExperience,
    education: fields.education,
    summary: fields.summary,
    source: "extracted",
  };
}

export async function extractResumeFromFile(
  file: File,
  extraSkills: string[] = [],
): Promise<ResumeParseResult> {
  const name = file.name.toLowerCase();
  let text = "";
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      text = await extractPdfText(await file.arrayBuffer());
    } else if (
      name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      text = await extractDocxText(await file.arrayBuffer());
    } else if (name.endsWith(".txt") || file.type === "text/plain") {
      text = await file.text();
    } else {
      return {
        fields: emptyFields(),
        warnings: ["Use a PDF, Word (.docx), or text file."],
        rawText: "",
      };
    }
  } catch {
    return {
      fields: emptyFields(),
      warnings: ["Couldn’t read this file. Try another PDF/DOCX or fill the form manually."],
      rawText: "",
    };
  }
  return extractFieldsFromText(text, extraSkills);
}

function emptyFields(): ExtractedResumeFields {
  return {
    fullName: "",
    email: "",
    phone: "",
    skills: [],
    yearsOfExperience: null,
    education: null,
    summary: null,
  };
}

function inferName(text: string, email: string | null): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/^(curriculum|resume|cv|profile|contact|address)\b/i.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;
    if (line.length > 48) continue;
    if (!/^[A-Za-z][A-Za-z .'-]+$/.test(line)) continue;
    return words.map(titleCase).join(" ");
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    const parts = local.split(/[._-]+/).filter((p) => p.length > 1);
    if (parts.length >= 2) return parts.map(titleCase).join(" ");
  }
  return "";
}

function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizePhone(raw: string): string {
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.length < 8) return "";
  return compact.startsWith("+") ? compact : compact;
}

function extractSkills(text: string, extra: string[]): string[] {
  const lower = text.toLowerCase();
  const lexicon = [...new Set([...DEFAULT_SKILL_LEXICON, ...extra.map((s) => s.toLowerCase())])];
  const found: string[] = [];
  for (const skill of lexicon) {
    const re = new RegExp(`\\b${escapeReg(skill)}\\b`, "i");
    if (re.test(lower)) found.push(prettySkill(skill));
  }
  const skillLine = text.split("\n").find((l) => /^(skills|competenc)/i.test(l.trim()));
  if (skillLine) {
    for (const part of skillLine.split(/[,;/|]+/)) {
      const t = part.replace(/^(skills|competencies)\s*[:\-–]?\s*/i, "").trim();
      if (t.length >= 2 && t.length <= 32 && !found.some((f) => f.toLowerCase() === t.toLowerCase())) {
        found.push(t);
      }
    }
  }
  return found.slice(0, 16);
}

function prettySkill(skill: string): string {
  if (skill === "b2b") return "B2B";
  if (skill === "crm") return "CRM";
  if (skill === "saas") return "SaaS";
  if (skill === "hris") return "HRIS";
  if (skill === "sla") return "SLA";
  return skill.charAt(0).toUpperCase() + skill.slice(1);
}

function escapeReg(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => import("pdfjs-dist"));
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc =
      pdfjs.GlobalWorkerOptions.workerSrc ||
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
  }
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 8);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join(" ");
    pages.push(line);
  }
  return pages.join("\n");
}

async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value ?? "";
}
