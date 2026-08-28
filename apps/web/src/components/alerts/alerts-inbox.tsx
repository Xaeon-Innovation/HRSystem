"use client";

import type { ReactNode } from "react";
import { Bell, CheckCheck, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_META,
  ALERT_URGENCIES,
} from "@hr/shared";
import type { AlertCategory, AlertUrgency } from "@hr/shared";
import { formatRelativeTime, resolveCategory, resolveUrgency } from "@/lib/alerts/format";
import type { InboxNotification } from "@/lib/alerts/types";
import {
  CATEGORY_ICON,
  CATEGORY_TONE,
  CategoryBadge,
  URGENCY_BAR,
  UrgencyBadge,
} from "@/components/alerts/alert-badges";

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
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={!unreadOnly && !category && !urgency}
            onClick={() => {
              onUnreadOnly(false);
              onCategory("");
              onUrgency("");
            }}
          >
            All
          </FilterChip>
          <FilterChip active={unreadOnly} onClick={() => onUnreadOnly(!unreadOnly)}>
            Unread
          </FilterChip>
          {ALERT_URGENCIES.map((u) => (
            <FilterChip
              key={u}
              active={urgency === u}
              onClick={() => onUrgency(urgency === u ? "" : u)}
            >
              {u === "info" ? "Info" : u === "warning" ? "Warning" : "Critical"}
            </FilterChip>
          ))}
        </div>
        <div className="flex gap-2">
          {isAdmin ? (
            <Button size="sm" variant="outline" onClick={onAnnounce}>
              <Megaphone className="h-4 w-4" />
              Announce
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onMarkAll}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALERT_CATEGORIES.filter((c) => c !== "custom").map((c) => (
          <FilterChip
            key={c}
            active={category === c}
            onClick={() => onCategory(category === c ? "" : c)}
          >
            {ALERT_CATEGORY_META[c].label}
          </FilterChip>
        ))}
      </div>
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold">You’re all caught up</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              New leave requests, compliance deadlines, KPI exceptions, and system
              issues will land here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const cat = resolveCategory(item);
            const urg = resolveUrgency(item);
            const Icon = CATEGORY_ICON[cat];
            return (
              <Card
                key={item.id}
                className={cn(
                  "overflow-hidden transition-opacity",
                  item.read ? "opacity-75" : "border-primary/15 bg-white",
                )}
              >
                <CardContent className="flex gap-0 p-0">
                  <span className={cn("w-1 shrink-0", URGENCY_BAR[urg])} />
                  <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1",
                        CATEGORY_TONE[cat],
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!item.read ? (
                          <span className="h-2 w-2 rounded-full bg-primary" aria-label="Unread" />
                        ) : null}
                        <p className="font-medium leading-tight">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <CategoryBadge category={cat} />
                        <UrgencyBadge urgency={urg} />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!item.read ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkRead(item.id)}
                      >
                        Read
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
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
        "rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
        active
          ? "bg-primary text-primary-foreground ring-primary"
          : "bg-white text-muted-foreground ring-border hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
