import type { FieldTransformConfig } from "@hr/db";

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".").filter(Boolean);
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    const record = current as Record<string, unknown>;
    const index = /^\d+$/.test(part) ? Number(part) : null;
    if (Array.isArray(current) && index != null) {
      current = current[index];
    } else {
      current = record[part];
    }
  }
  return current;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function extractItems(payload: unknown, itemsPath?: string): unknown[] {
  const value = itemsPath ? getPath(payload, itemsPath) : payload;
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function applyTransform(
  value: unknown,
  transformType: string,
  config: FieldTransformConfig = {},
): unknown {
  if (value == null || value === "") return null;
  switch (transformType) {
    case "enum_map":
      return config.enumMap?.[String(value)] ?? value;
    case "date_parse":
      return parseDate(value)?.toISOString() ?? null;
    case "number_parse":
      return parseNumber(value);
    case "custom":
      return value;
    case "direct":
    default:
      return value;
  }
}

export type MappingRule = {
  sourceField: string;
  targetField: string;
  transformType: string;
  transformConfig?: FieldTransformConfig;
  isRequired?: boolean;
};

export function mapRecord(
  payload: Record<string, unknown>,
  rules: MappingRule[],
): { mapped: Record<string, unknown>; missing: string[] } {
  const mapped: Record<string, unknown> = {};
  const missing: string[] = [];
  for (const rule of rules) {
    const raw = getPath(payload, rule.sourceField);
    const value = applyTransform(
      raw,
      rule.transformType,
      rule.transformConfig ?? {},
    );
    if (
      (value == null || value === "") &&
      rule.isRequired
    ) {
      missing.push(rule.targetField);
    }
    mapped[rule.targetField] = value ?? null;
  }
  return { mapped, missing };
}

export function hashExternalId(payload: unknown): string {
  const json = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = (hash * 31 + json.charCodeAt(i)) | 0;
  }
  return `gen_${Math.abs(hash)}`;
}
