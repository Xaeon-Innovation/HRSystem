import {
  PLAN_LIMIT_KEYS,
  type PlanLimitKey,
} from "./constants.js";
import {
  MODULE_KEYS,
  expandLegacyFeatureRecord,
  type ModuleKey,
  PLAN_FEATURE_KEYS,
  PLAN_FEATURE_LABELS,
  type PlanFeatureKey,
} from "./modules.js";

export type PlanFeatureFlags = Partial<
  Record<ModuleKey, boolean> &
    Record<"fieldOps" | "peopleOps", boolean> &
    Record<PlanLimitKey, number | string>
>;

export type FeatureOverrides = Partial<Record<ModuleKey, boolean>>;

export { PLAN_FEATURE_KEYS, PLAN_FEATURE_LABELS, type PlanFeatureKey, type ModuleKey };

/**
 * Merge plan catalog features with tenant overrides.
 * Override true/false wins; missing override inherits the plan value.
 * Numeric / limit keys from the plan are preserved unchanged.
 * Legacy pack keys (fieldOps / peopleOps) are expanded before merge.
 */
export function resolveEffectiveFeatures(
  planFeatures: PlanFeatureFlags | null | undefined,
  overrides: FeatureOverrides | null | undefined,
): PlanFeatureFlags {
  const expandedPlan = expandLegacyFeatureRecord(
    planFeatures as Record<string, boolean | number | string> | null,
  );
  const expandedOverrides = expandLegacyFeatureRecord(
    overrides as Record<string, boolean | number | string> | null,
  );
  const base: PlanFeatureFlags = { ...(expandedPlan as PlanFeatureFlags) };
  for (const key of MODULE_KEYS) {
    const override = expandedOverrides[key];
    if (override === true || override === false) {
      base[key] = override;
    }
  }
  return base;
}

/** Keep only known boolean module keys + known limit keys from a loose record. */
export function sanitizePlanFeatures(
  input: Record<string, boolean | number | string> | null | undefined,
): PlanFeatureFlags {
  if (!input) return {};
  const expanded = expandLegacyFeatureRecord(input);
  const out: PlanFeatureFlags = {};
  for (const key of MODULE_KEYS) {
    if (typeof expanded[key] === "boolean") out[key] = expanded[key] as boolean;
  }
  for (const key of PLAN_LIMIT_KEYS) {
    const v = expanded[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "string" && v.length > 0) out[key] = v;
  }
  return out;
}

export function cleanFeatureOverrides(
  input: Record<string, boolean | null | undefined> | null | undefined,
): FeatureOverrides {
  if (!input) return {};
  const expanded = expandLegacyFeatureRecord(
    Object.fromEntries(
      Object.entries(input).filter(
        ([, v]) => v === true || v === false,
      ) as [string, boolean][],
    ),
  );
  const out: FeatureOverrides = {};
  for (const key of MODULE_KEYS) {
    const v = expanded[key];
    if (v === true || v === false) out[key] = v;
  }
  return out;
}

export type { PlanLimitKey };
