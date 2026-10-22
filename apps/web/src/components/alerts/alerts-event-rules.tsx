"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_META,
  ALERT_CHANNEL_META,
  ALERT_FREQUENCY_META,
  ALERT_RECIPIENT_META,
} from "@hr/shared";
import type { AlertCategory } from "@hr/shared";
import type { AlertRule } from "@/lib/alerts/types";
import { CATEGORY_ICON, UrgencyBadge } from "@/components/alerts/alert-badges";
import { t } from "@/i18n";

export function AlertsEventRules({
  rules,
  selectedCategory,
  onSelectCategory,
  onToggle,
  onOpen,
}: {
  rules: AlertRule[];
  selectedCategory: AlertCategory | "all";
  onSelectCategory: (category: AlertCategory | "all") => void;
  onToggle: (rule: AlertRule, enabled: boolean) => void;
  onOpen: (rule: AlertRule) => void;
}) {
  const [query, setQuery] = useState("");
  const catalog = rules.filter((r) => r.kind === "catalog");
  const categories = ALERT_CATEGORIES.filter((c) => c !== "custom");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((rule) => {
      if (selectedCategory !== "all" && rule.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        rule.name.toLowerCase().includes(q) ||
        (rule.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [catalog, query, selectedCategory]);

  const grouped = categories
    .map((category) => ({
      category,
      rules: visible.filter((r) => r.category === category),
    }))
    .filter((g) => g.rules.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        {t("Turn each lifecycle event on or off, then choose who gets it, how it is delivered, and how urgent it is. Batch quieter events into a digest so the inbox stays useful.")}</p>
      <div className="flex flex-col gap-3 lg:flex-row">
        <aside className="flex gap-1 overflow-x-auto lg:w-48 lg:flex-col lg:overflow-visible">
          <CategoryTab
            active={selectedCategory === "all"}
            label="All events"
            count={catalog.length}
            onClick={() => onSelectCategory("all")}
          />
          {categories.map((category) => {
            const Icon = CATEGORY_ICON[category];
            const count = catalog.filter((r) => r.category === category).length;
            const on = catalog.filter((r) => r.category === category && r.enabled).length;
            return (
              <CategoryTab
                key={category}
                active={selectedCategory === category}
                label={ALERT_CATEGORY_META[category].label}
                count={`${on}/${count}`}
                icon={Icon}
                onClick={() => onSelectCategory(category)}
              />
            );
          })}
        </aside>
        <div className="min-w-0 flex-1 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search events")}
              className="pl-9"
            />
          </div>
          {grouped.map((group) => (
            <section key={group.category} className="space-y-2">
              {selectedCategory === "all" ? (
                <div>
                  <h2 className="text-sm font-semibold">
                    {ALERT_CATEGORY_META[group.category].label}
                  </h2>
                  <p className="text-xs text-ink-muted">
                    {ALERT_CATEGORY_META[group.category].blurb}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ink-muted">
                  {ALERT_CATEGORY_META[group.category].blurb}
                </p>
              )}
              {group.rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={cn(!rule.enabled && "opacity-70")}
                >
                  <CardContent className="flex items-start gap-3 py-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(next) => onToggle(rule, next)}
                      aria-label={`Enable ${rule.name}`}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onOpen(rule)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{rule.name}</p>
                        <UrgencyBadge urgency={rule.urgency} />
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {rule.description}
                      </p>
                      <p className="mt-2 text-xs text-ink-muted">
                        {rule.recipients.map((r) => ALERT_RECIPIENT_META[r].label).join(", ")}
                        {" · "}
                        {rule.channels.map((c) => ALERT_CHANNEL_META[c].label).join(", ")}
                        {" · "}
                        {ALERT_FREQUENCY_META[rule.frequency].label}
                        {rule.escalateAfterHours
                          ? ` · escalate after ${rule.escalateAfterHours}h`
                          : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-2 text-ink-muted hover:bg-surface-2 hover:text-ink"
                      onClick={() => onOpen(rule)}
                      aria-label={`Configure ${rule.name}`}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </section>
          ))}
          {visible.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("No events match that search.")}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  label,
  count,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: string | number;
  icon?: typeof Search;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm",
        active ? "bg-primary text-primary-foreground" : "hover:bg-surface-2",
      )}
    >
      <span className="inline-flex items-center gap-2">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </span>
      <span className={cn("text-xs", active ? "opacity-80" : "text-ink-muted")}>
        {count}
      </span>
    </button>
  );
}
