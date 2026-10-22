"use client";

import type { ReactNode } from "react";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_META,
  ALERT_URGENCIES,
} from "@hr/shared";
import type { AlertCategory, AlertUrgency } from "@hr/shared";
import { formatRelativeTime, resolveCategory, resolveUrgency } from "@/lib/alerts/format";
import type { InboxNotification } from "@/lib/alerts/types";
import { CATEGORY_ICON } from "@/components/alerts/alert-badges";
import {
  Chip,
  EmptyState,
  IconTile,
  Segmented,
} from "@/components/elevora";
import { t } from "@/i18n";

export function AlertsInbox({
  items,
  isAdmin,
  category,
  urgency,
  unreadOnly,
  onCategory,
  onUrgency,
  onUnreadOnly,
  onMarkRead,
  onMarkAll,
  onAnnounce,
}: {
  items: InboxNotification[];
  isAdmin: boolean;
  category: AlertCategory | "";
  urgency: AlertUrgency | "";
  unreadOnly: boolean;
  onCategory: (value: AlertCategory | "") => void;
  onUrgency: (value: AlertUrgency | "") => void;
  onUnreadOnly: (value: boolean) => void;
  onMarkRead: (id: string) => void;
  onMarkAll: () => void;
  onAnnounce: () => void;
}) {
  const urgencySegment =
    urgency === ""
      ? "all"
      : urgency === "info"
        ? "info"
        : urgency === "warning"
          ? "warning"
          : "critical";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Segmented
          className="w-full sm:w-auto"
          value={unreadOnly ? "unread" : urgencySegment}
          onChange={(v) => {
            if (v === "unread") {
              onUnreadOnly(true);
              onUrgency("");
              return;
            }
            onUnreadOnly(false);
            if (v === "all") {
              onUrgency("");
              return;
            }
            onUrgency(v as AlertUrgency);
          }}
          options={[
            { value: "all", label: t("All") },
            { value: "unread", label: t("Unread") },
            ...ALERT_URGENCIES.map((u) => ({
              value: u,
              label:
                u === "info"
                  ? t("Info")
                  : u === "warning"
                    ? t("Warning")
                    : t("Critical"),
            })),
          ]}
          aria-label={t("Inbox filters")}
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="flex min-h-10 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm text-ink-2">
            <Switch
              checked={unreadOnly}
              onCheckedChange={(on) => {
                onUnreadOnly(on);
                if (on) onUrgency("");
              }}
            />
            <span>{t("Unread only")}</span>
          </label>
          {isAdmin ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onAnnounce}
            >
              <Megaphone className="h-4 w-4" />
              {t("Announce")}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onMarkAll}
          >
            <CheckCheck className="h-4 w-4" />
            {t("Mark all read")}
          </Button>
        </div>
      </div>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
        <CategoryChip
          active={!category}
          onClick={() => onCategory("")}
        >
          {t("All categories")}
        </CategoryChip>
        {ALERT_CATEGORIES.filter((c) => c !== "custom").map((c) => (
          <CategoryChip
            key={c}
            active={category === c}
            onClick={() => onCategory(category === c ? "" : c)}
          >
            {ALERT_CATEGORY_META[c].label}
          </CategoryChip>
        ))}
      </div>
      {items.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={<Bell className="h-5 w-5" />}
            title={t("You’re all caught up")}
            subtitle={t(
              "New leave requests, compliance deadlines, KPI exceptions, and system issues will land here.",
            )}
          />
        </div>
      ) : (
        <section className="rounded-lg border border-line bg-surface px-[18px]">
          {items.map((item) => {
            const cat = resolveCategory(item);
            const urg = resolveUrgency(item);
            const Icon = CATEGORY_ICON[cat];
            const high = urg === "critical" || urg === "warning";
            const tileTone = high ? "warn" : "neutral";
            return (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-2 border-b border-line py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-3",
                  item.read && "opacity-80",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <IconTile tone={tileTone} className="mt-0.5 shrink-0">
                    <Icon className="h-4 w-4" strokeWidth={1.7} />
                  </IconTile>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-ink">
                      {!item.read ? (
                        <span
                          className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-accent"
                          aria-label={t("Unread")}
                        />
                      ) : null}
                      <span className="truncate">{item.title}</span>
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-ink-muted whitespace-normal">
                      {item.body}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:hidden">
                      <Chip className="border border-line">
                        {t(ALERT_CATEGORY_META[cat].label)}
                      </Chip>
                      {high ? <Chip tone="warn">{t("High")}</Chip> : null}
                    </div>
                  </div>
                </div>

                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  <Chip className="border border-line">
                    {t(ALERT_CATEGORY_META[cat].label)}
                  </Chip>
                  {high ? <Chip tone="warn">{t("High")}</Chip> : null}
                </div>

                <div className="flex shrink-0 flex-row items-center justify-between gap-3 ps-11 sm:min-w-[5.5rem] sm:flex-col sm:items-end sm:justify-center sm:gap-0.5 sm:ps-0">
                  <span className="text-[11px] text-ink-muted tabular">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                  {!item.read ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-ink hover:underline"
                      onClick={() => onMarkRead(item.id)}
                    >
                      {t("Mark read")}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-ink bg-ink text-primary-foreground"
          : "border-line bg-surface text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
