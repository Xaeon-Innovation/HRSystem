import type { PlanCode } from "./constants.js";

/** Product entitlement modules (finer than marketing packs). */
export const MODULE_KEYS = [
  "liveMap",
  "teamToday",
  "leave",
  "hiring",
  "kpis",
  "compensation",
  "tasks",
  "analytics",
  "integrations",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/** Legacy pack keys still accepted in stored JSON; expanded at resolve time. */
export const LEGACY_PACK_KEYS = ["fieldOps", "peopleOps"] as const;
export type LegacyPackKey = (typeof LEGACY_PACK_KEYS)[number];

export const MODULE_PACK_GROUPS = [
  "fieldOps",
  "peopleOps",
  "analytics",
  "integrations",
] as const;
export type ModulePackGroup = (typeof MODULE_PACK_GROUPS)[number];

export const MODULE_LAUNCH_STATUSES = ["draft", "lab", "ga"] as const;
export type ModuleLaunchStatus = (typeof MODULE_LAUNCH_STATUSES)[number];

export const WORKSPACE_MODES = [
  "unlock_all",
  "as_entitled",
  "preview_plan",
] as const;
export type WorkspaceMode = (typeof WORKSPACE_MODES)[number];

export type ModuleNavAudience = "tenant_admin" | "employee" | "both";

export type ModuleDefinition = {
  key: ModuleKey;
  label: string;
  pack: ModulePackGroup;
  /** Primary admin href for nav / FeatureGate. */
  href: string;
  /** Employee-facing href when different (e.g. analytics/me). */
  employeeHref?: string;
  audience: ModuleNavAudience;
  defaultLaunch: ModuleLaunchStatus;
  /** Plan codes that enable this module by default in seed. */
  defaultOnPlans: readonly string[];
};

const ALL_FULL = ["trial", "ops", "scale", "enterprise", "pro"];
const PEOPLE_PLANS = [
  "trial",
  "people",
  "ops",
  "scale",
  "enterprise",
  "pro",
];
const FIELD_PLANS = [
  "trial",
  "field",
  "ops",
  "scale",
  "enterprise",
  "starter",
  "pro",
];
const ANALYTICS_PLANS = ["trial", "ops", "scale", "enterprise", "pro"];
const INTEGRATIONS_PLANS = ["scale", "enterprise", "pro"];

export const MODULE_DEFINITIONS: readonly ModuleDefinition[] = [
  {
    key: "liveMap",
    label: "Live map",
    pack: "fieldOps",
    href: "/app/map",
    audience: "tenant_admin",
    defaultLaunch: "ga",
    defaultOnPlans: FIELD_PLANS,
  },
  {
    key: "teamToday",
    label: "Team today",
    pack: "fieldOps",
    href: "/app/team",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: FIELD_PLANS,
  },
  {
    key: "leave",
    label: "Leave",
    pack: "peopleOps",
    href: "/app/leave",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: PEOPLE_PLANS,
  },
  {
    key: "hiring",
    label: "Hiring",
    pack: "peopleOps",
    href: "/app/hiring",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: PEOPLE_PLANS,
  },
  {
    key: "kpis",
    label: "KPIs",
    pack: "peopleOps",
    href: "/app/kpis",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: PEOPLE_PLANS,
  },
  {
    key: "compensation",
    label: "Compensation",
    pack: "peopleOps",
    href: "/app/compensation",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: PEOPLE_PLANS,
  },
  {
    key: "tasks",
    label: "Tasks",
    pack: "peopleOps",
    href: "/app/tasks",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: PEOPLE_PLANS,
  },
  {
    key: "analytics",
    label: "Analytics",
    pack: "analytics",
    href: "/app/analytics",
    employeeHref: "/app/analytics/me",
    audience: "both",
    defaultLaunch: "ga",
    defaultOnPlans: ANALYTICS_PLANS,
  },
  {
    key: "integrations",
    label: "Integrations",
    pack: "integrations",
    href: "/app/integrations",
    audience: "tenant_admin",
    defaultLaunch: "ga",
    defaultOnPlans: INTEGRATIONS_PLANS,
  },
] as const;

export const MODULE_LABELS: Record<ModuleKey, string> = Object.fromEntries(
  MODULE_DEFINITIONS.map((m) => [m.key, m.label]),
) as Record<ModuleKey, string>;

export const MODULE_BY_KEY: Record<ModuleKey, ModuleDefinition> =
  Object.fromEntries(MODULE_DEFINITIONS.map((m) => [m.key, m])) as Record<
    ModuleKey,
    ModuleDefinition
  >;

export const PACK_GROUP_LABELS: Record<ModulePackGroup, string> = {
  fieldOps: "Field ops",
  peopleOps: "People ops",
  analytics: "Analytics",
  integrations: "Integrations",
};

export const MODULES_BY_PACK: Record<ModulePackGroup, ModuleKey[]> = {
  fieldOps: ["liveMap", "teamToday"],
  peopleOps: ["leave", "hiring", "kpis", "compensation", "tasks"],
  analytics: ["analytics"],
  integrations: ["integrations"],
};

/** @deprecated Use MODULE_KEYS — kept as alias for older imports. */
export const PLAN_FEATURE_KEYS = MODULE_KEYS;
/** @deprecated Use ModuleKey */
export type PlanFeatureKey = ModuleKey;

export const PLAN_FEATURE_LABELS: Record<ModuleKey, string> = MODULE_LABELS;

export function modulesForPack(pack: ModulePackGroup): ModuleKey[] {
  return MODULES_BY_PACK[pack];
}

export function expandPackToModules(
  pack: ModulePackGroup,
  enabled: boolean,
): Partial<Record<ModuleKey, boolean>> {
  const out: Partial<Record<ModuleKey, boolean>> = {};
  for (const key of MODULES_BY_PACK[pack]) out[key] = enabled;
  return out;
}

/**
 * Expand legacy pack booleans (fieldOps / peopleOps) into module keys.
 * Module keys already present win over pack expansion.
 */
export function expandLegacyFeatureRecord(
  input: Record<string, boolean | number | string> | null | undefined,
): Record<string, boolean | number | string> {
  if (!input) return {};
  const out: Record<string, boolean | number | string> = { ...input };

  if (typeof input.fieldOps === "boolean") {
    for (const key of MODULES_BY_PACK.fieldOps) {
      if (typeof out[key] !== "boolean") out[key] = input.fieldOps;
    }
  }
  if (typeof input.peopleOps === "boolean") {
    for (const key of MODULES_BY_PACK.peopleOps) {
      if (typeof out[key] !== "boolean") out[key] = input.peopleOps;
    }
  }
  return out;
}

/** Derive pack booleans for pricing / marketing from module flags. */
export function derivePackFlags(
  modules: Partial<Record<ModuleKey, boolean>> | null | undefined,
): Record<ModulePackGroup, boolean> {
  return {
    fieldOps: MODULES_BY_PACK.fieldOps.some((k) => modules?.[k] === true),
    peopleOps: MODULES_BY_PACK.peopleOps.some((k) => modules?.[k] === true),
    analytics: modules?.analytics === true,
    integrations: modules?.integrations === true,
  };
}

export function defaultModulesForPlanCode(
  code: string,
): Partial<Record<ModuleKey, boolean>> {
  const out: Partial<Record<ModuleKey, boolean>> = {};
  for (const def of MODULE_DEFINITIONS) {
    out[def.key] = def.defaultOnPlans.includes(code);
  }
  return out;
}

/** Map module → FeatureGate / requirePlanFeature path prefixes. */
export function moduleForPath(pathname: string): ModuleKey | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const def of MODULE_DEFINITIONS) {
    const targets = [def.href, def.employeeHref].filter(Boolean) as string[];
    for (const href of targets) {
      if (normalized === href || normalized.startsWith(`${href}/`)) {
        return def.key;
      }
    }
  }
  return null;
}
