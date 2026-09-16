import {
  MODULE_DEFINITIONS,
  type ModuleKey,
} from "@hr/shared";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  ListTodo,
  MapPinned,
  Palmtree,
  Plug,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/i18n";

const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  liveMap: MapPinned,
  teamToday: Users,
  leave: Palmtree,
  hiring: Briefcase,
  kpis: ClipboardList,
  compensation: Wallet,
  tasks: ListTodo,
  analytics: BarChart3,
  integrations: Plug,
};

export type ModuleNavFlags = Partial<Record<ModuleKey, boolean>>;

export function moduleNavFlagsFromFeatures(
  features: Record<string, boolean | number | string> | null | undefined,
  unlocked: boolean,
): ModuleNavFlags {
  const out: ModuleNavFlags = {};
  for (const def of MODULE_DEFINITIONS) {
    out[def.key] = unlocked || features?.[def.key] === true;
  }
  return out;
}

export function moduleIcon(key: ModuleKey): LucideIcon {
  return MODULE_ICONS[key];
}

export function moduleLabel(key: ModuleKey): string {
  const def = MODULE_DEFINITIONS.find((d) => d.key === key);
  return t(def?.label ?? key);
}

export function adminHrefFor(key: ModuleKey): string {
  return MODULE_DEFINITIONS.find((d) => d.key === key)!.href;
}

export function employeeHrefFor(key: ModuleKey): string {
  const def = MODULE_DEFINITIONS.find((d) => d.key === key)!;
  return def.employeeHref ?? def.href;
}
