"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { api, getUser, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  IconTile,
  Notice,
  PageHeader,
  Segmented,
  StatBlock,
} from "@/components/elevora";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TEXTAREA_CLASS } from "@/lib/alerts/format";
import { resolveUrgency } from "@/lib/alerts/format";
import type { AlertRule, InboxNotification } from "@/lib/alerts/types";
import type { AlertCategory, AlertUrgency } from "@hr/shared";
import { AlertRuleSheet } from "@/components/alerts/alert-rule-sheet";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { AlertsCustomBuilder, type CustomAlertDraft } from "@/components/alerts/alerts-custom-builder";
import { AlertsEventRules } from "@/components/alerts/alerts-event-rules";
import { AlertsInbox } from "@/components/alerts/alerts-inbox";
import { t } from "@/i18n";

export function AlertsDashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inbox");
  const [category, setCategory] = useState<AlertCategory | "">("");
  const [urgency, setUrgency] = useState<AlertUrgency | "">("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [eventCategory, setEventCategory] = useState<AlertCategory | "all">("all");
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [announceOpen, setAnnounceOpen] = useState(false);

  const isAdmin = user?.role === "tenant_admin";

  async function loadInbox() {
    const params = new URLSearchParams();
    if (unreadOnly) params.set("unread", "true");
    if (category) params.set("category", category);
    if (urgency) params.set("urgency", urgency);
    const qs = params.toString();
    const data = await api<{ notifications: InboxNotification[] }>(
      `/v1/notifications${qs ? `?${qs}` : ""}`,
    );
    setItems(data.notifications);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("hr-alerts-changed"));
    }
  }

  async function loadRules() {
    if (!isAdmin) return;
    const data = await api<{ rules: AlertRule[] }>("/v1/notifications/rules");
    setRules(data.rules);
  }

  async function reload() {
    setError(null);
    await Promise.all([loadInbox(), isAdmin ? loadRules() : Promise.resolve()]);
  }

  useEffect(() => {
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (user === null) return;
    reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load alerts"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isAdmin, unreadOnly, category, urgency]);

  const unread = items.filter((n) => !n.read).length;
  const critical = items.filter((n) => !n.read && resolveUrgency(n) === "critical").length;
  const activeRules = rules.filter((r) => r.kind === "catalog" && r.enabled).length;
  const customRules = rules.filter((r) => r.kind === "custom").length;

  async function patchRule(id: string, patch: Partial<AlertRule>) {
    const data = await api<{ rule: AlertRule }>(`/v1/notifications/rules/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setRules((prev) => prev.map((r) => (r.id === id ? data.rule : r)));
    return data.rule;
  }

  const cards = useMemo(() => {
    if (isAdmin) {
      return [
        { label: t("Unread"), value: String(unread), hint: t("Waiting in your inbox"), icon: BellRing },
        { label: t("Critical"), value: String(critical), hint: t("Needs action today"), icon: ShieldAlert },
        { label: t("Event alerts on"), value: String(activeRules), hint: `${rules.filter((r) => r.kind === "catalog").length} in catalog`, icon: SlidersHorizontal },
        { label: t("Custom rules"), value: String(customRules), hint: t("Threshold builders"), icon: Sparkles },
      ];
    }
    return [
      { label: t("Unread"), value: String(unread), hint: t("New for you"), icon: BellRing },
      { label: t("Critical"), value: String(critical), hint: t("High urgency"), icon: ShieldAlert },
      { label: t("In inbox"), value: String(items.length), hint: t("Last 100 items"), icon: Bell },
    ];
  }, [isAdmin, unread, critical, activeRules, customRules, rules, items.length]);

  if (loading) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Alerts")}
        subtitle={
          isAdmin
            ? t(
                "Inbox for live notices, plus routing for employee, leave, KPI, attendance, payroll, and system events.",
              )
            : t(
                "Your HR notices, leave updates, deadlines, and anything that needs attention.",
              )
        }
      />
      {error ? <Notice tone="warn">{error}</Notice> : null}
      <div
        className={cn(
          "grid gap-3",
          isAdmin ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-3",
        )}
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-sm border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-start justify-between gap-2">
                <StatBlock label={card.label} value={card.value} size="sm" />
                <IconTile tone="accent">
                  <Icon className="h-4 w-4" />
                </IconTile>
              </div>
              <p className="mt-2 text-xs text-ink-muted">{card.hint}</p>
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <div className="space-y-4">
          <div className="max-w-full overflow-x-auto">
            <Segmented
              className="w-max"
              aria-label={t("Alert sections")}
              value={tab}
              onChange={setTab}
              options={[
                {
                  value: "inbox",
                  label:
                    unread > 0
                      ? `${t("Inbox")} (${unread > 99 ? "99+" : unread})`
                      : t("Inbox"),
                },
                { value: "events", label: t("Event alerts") },
                {
                  value: "custom",
                  label:
                    customRules > 0
                      ? `${t("Custom")} (${customRules})`
                      : t("Custom"),
                },
              ]}
            />
          </div>
          {tab === "inbox" ? (
            <AlertsInbox
              items={items}
              isAdmin={isAdmin}
              category={category}
              urgency={urgency}
              unreadOnly={unreadOnly}
              onCategory={setCategory}
              onUrgency={setUrgency}
              onUnreadOnly={setUnreadOnly}
              onMarkRead={(id) =>
                api(`/v1/notifications/${id}/read`, { method: "POST" }).then(
                  loadInbox,
                )
              }
              onMarkAll={() =>
                api("/v1/notifications/read-all", { method: "POST" }).then(
                  loadInbox,
                )
              }
              onAnnounce={() => setAnnounceOpen(true)}
            />
          ) : null}
          {tab === "events" ? (
            <AlertsEventRules
              rules={rules}
              selectedCategory={eventCategory}
              onSelectCategory={setEventCategory}
              onToggle={(rule, enabled) => void patchRule(rule.id, { enabled })}
              onOpen={setEditing}
            />
          ) : null}
          {tab === "custom" ? (
            <AlertsCustomBuilder
              rules={rules}
              onToggle={(rule, enabled) => void patchRule(rule.id, { enabled })}
              onCreate={async (draft) => {
                await api("/v1/notifications/rules", {
                  method: "POST",
                  body: JSON.stringify(payloadFromDraft(draft)),
                });
                await loadRules();
              }}
              onUpdate={async (id, draft) => {
                await patchRule(id, payloadFromDraft(draft));
              }}
              onDelete={async (id) => {
                await api(`/v1/notifications/rules/${id}`, {
                  method: "DELETE",
                });
                await loadRules();
              }}
            />
          ) : null}
        </div>
      ) : (
        <AlertsInbox
          items={items}
          isAdmin={false}
          category={category}
          urgency={urgency}
          unreadOnly={unreadOnly}
          onCategory={setCategory}
          onUrgency={setUrgency}
          onUnreadOnly={setUnreadOnly}
          onMarkRead={(id) =>
            api(`/v1/notifications/${id}/read`, { method: "POST" }).then(loadInbox)
          }
          onMarkAll={() =>
            api("/v1/notifications/read-all", { method: "POST" }).then(loadInbox)
          }
          onAnnounce={() => undefined}
        />
      )}

      <AlertRuleSheet
        rule={editing}
        open={Boolean(editing)}
        saving={savingRule}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSave={async (id, patch) => {
          setSavingRule(true);
          try {
            await patchRule(id, patch);
            setEditing(null);
          } finally {
            setSavingRule(false);
          }
        }}
      />
      <AnnounceSheet
        open={announceOpen}
        onOpenChange={setAnnounceOpen}
        onSent={loadInbox}
      />
    </div>
  );
}

function payloadFromDraft(draft: CustomAlertDraft) {
  return {
    name: draft.name,
    description: draft.description || null,
    enabled: draft.enabled,
    urgency: draft.urgency,
    channels: draft.channels,
    frequency: draft.frequency,
    recipients: draft.recipients,
    escalateAfterHours: draft.escalateAfterHours,
    source: draft.source,
    condition: draft.condition,
    metric: draft.metric,
    threshold: draft.threshold,
    durationValue: draft.durationValue,
    durationUnit: draft.durationUnit,
    scope: draft.scope,
    titleTemplate: draft.titleTemplate,
    bodyTemplate: draft.bodyTemplate,
  };
}

function AnnounceSheet({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/v1/notifications/announce", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      setTitle("");
      setBody("");
      onOpenChange(false);
      await onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={submit}>
          <SheetHeader>
            <SheetTitle>{t("Broadcast announcement")}</SheetTitle>
            <SheetDescription>
              {t("Sends an in-app notice to everyone in this company.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="announce-title">{t("Title")}</Label>
              <Input
                id="announce-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="announce-body">{t("Message")}</Label>
              <textarea
                id="announce-body"
                className={TEXTAREA_CLASS}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}</Button>
            <Button type="submit" disabled={busy}>
              {busy ? t("Sending…") : t("Send")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
