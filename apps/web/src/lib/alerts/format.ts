import type { AlertCategory, AlertUrgency } from "@hr/shared";
import {
  categoryFromNotificationType,
  urgencyFromNotificationType,
} from "@hr/shared";
import type { InboxNotification } from "./types";
import { t, intlLocale, intlDateOptions } from "@/i18n";

export const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const TEXTAREA_CLASS =
  "min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const mins = Math.max(0, Math.round((now - then) / 60_000));
  if (mins < 1) return t("Just now");
  if (mins < 60) return t("{n}m ago", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("{n}h ago", { n: hours });
  const days = Math.round(hours / 24);
  if (days < 7) return t("{n}d ago", { n: days });
  return new Date(iso).toLocaleString(
    intlLocale(),
    intlDateOptions({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
  );
}

export function resolveCategory(n: InboxNotification): AlertCategory {
  return n.category ?? categoryFromNotificationType(n.type) ?? "system";
}

export function resolveUrgency(n: InboxNotification): AlertUrgency {
  return n.urgency ?? urgencyFromNotificationType(n.type);
}
