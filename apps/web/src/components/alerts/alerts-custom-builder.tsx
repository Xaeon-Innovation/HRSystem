"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SELECT_CLASS, TEXTAREA_CLASS } from "@/lib/alerts/format";
import type { AlertRule } from "@/lib/alerts/types";
import {
  ALERT_CHANNELS,
  ALERT_CHANNEL_META,
  ALERT_CONDITIONS,
  ALERT_CONDITION_META,
  ALERT_DURATION_UNITS,
  ALERT_DURATION_UNIT_META,
  ALERT_FREQUENCIES,
  ALERT_FREQUENCY_META,
  ALERT_METRICS,
  ALERT_METRIC_META,
  ALERT_RECIPIENTS,
  ALERT_RECIPIENT_META,
  ALERT_SCOPES,
  ALERT_SCOPE_META,
  ALERT_SOURCES,
  ALERT_SOURCE_META,
  ALERT_TEMPLATE_FIELDS,
  ALERT_URGENCIES,
  ALERT_URGENCY_META,
  CUSTOM_ALERT_EXAMPLES,
  interpolateAlertTemplate,
  metricsForSource,
  type CustomAlertExample,
} from "@hr/shared";
import type { AlertChannel, AlertRecipient } from "@hr/shared";
import { CategoryBadge, UrgencyBadge } from "@/components/alerts/alert-badges";
import { t } from "@/i18n";

export type CustomAlertDraft = {
  name: string;
  description: string;
  enabled: boolean;
  urgency: AlertRule["urgency"];
  channels: AlertChannel[];
  frequency: AlertRule["frequency"];
  recipients: AlertRecipient[];
  escalateAfterHours: number | null;
  source: AlertRule["source"];
  condition: AlertRule["condition"];
  metric: AlertRule["metric"];
  threshold: number | null;
  durationValue: number | null;
  durationUnit: AlertRule["durationUnit"];
  scope: AlertRule["scope"];
  titleTemplate: string;
  bodyTemplate: string;
};

const EMPTY_DRAFT: CustomAlertDraft = {
  name: "",
  description: "",
  enabled: true,
  urgency: "warning",
  channels: ["in_app", "email"],
  frequency: "instant",
  recipients: ["admin"],
  escalateAfterHours: null,
  source: "leave",
  condition: "below",
  metric: "leave_balance",
  threshold: 3,
  durationValue: null,
  durationUnit: null,
  scope: "company",
  titleTemplate: "{{employee_name}} crossed a threshold",
  bodyTemplate:
    "{{employee_name}} in {{department}} is at {{metric_value}} as of {{date}}.",
};

function fromExample(example: CustomAlertExample): CustomAlertDraft {
  return {
    name: example.name,
    description: "",
    enabled: true,
    urgency: example.urgency,
    channels: example.channels,
    frequency: example.frequency,
    recipients: example.recipients,
    escalateAfterHours: null,
    source: example.source,
    condition: example.condition,
    metric: example.metric,
    threshold: example.threshold,
    durationValue: example.durationValue,
    durationUnit: example.durationUnit,
    scope: example.scope,
    titleTemplate: example.titleTemplate,
    bodyTemplate: example.bodyTemplate,
  };
}

function fromRule(rule: AlertRule): CustomAlertDraft {
  return {
    name: rule.name,
    description: rule.description ?? "",
    enabled: rule.enabled,
    urgency: rule.urgency,
    channels: rule.channels,
    frequency: rule.frequency,
    recipients: rule.recipients,
    escalateAfterHours: rule.escalateAfterHours,
    source: rule.source ?? "leave",
    condition: rule.condition ?? "below",
    metric: rule.metric ?? "leave_balance",
    threshold: rule.threshold,
    durationValue: rule.durationValue,
    durationUnit: rule.durationUnit,
    scope: rule.scope ?? "company",
    titleTemplate: rule.titleTemplate ?? EMPTY_DRAFT.titleTemplate,
    bodyTemplate: rule.bodyTemplate ?? EMPTY_DRAFT.bodyTemplate,
  };
}

export function AlertsCustomBuilder({
  rules,
  onCreate,
  onUpdate,
  onDelete,
  onToggle,
}: {
  rules: AlertRule[];
  onCreate: (draft: CustomAlertDraft) => Promise<void>;
  onUpdate: (id: string, draft: CustomAlertDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (rule: AlertRule, enabled: boolean) => void;
}) {
  const custom = rules.filter((r) => r.kind === "custom");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [draft, setDraft] = useState<CustomAlertDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew(example?: CustomAlertExample) {
    setEditing(null);
    setDraft(example ? fromExample(example) : EMPTY_DRAFT);
    setOpen(true);
  }

  function openEdit(rule: AlertRule) {
    setEditing(rule);
    setDraft(fromRule(rule));
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing) await onUpdate(editing.id, draft);
      else await onCreate(draft);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm text-ink-muted">
          {t("Build a threshold on a metric, pick who should hear about it, and write the message. Start from a common example or define your own.")}</p>
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4" />
          {t("New custom alert")}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {CUSTOM_ALERT_EXAMPLES.map((example) => (
          <button
            key={example.name}
            type="button"
            onClick={() => openNew(example)}
            className="rounded-full bg-surface px-3 py-1 text-xs font-medium ring-1 ring-line hover:bg-surface-2"
          >
            {example.name}
          </button>
        ))}
      </div>
      {custom.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-ink-muted">
            {t("No custom alerts yet. Try “Low annual leave balance” to see the builder with a real example filled in.")}</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {custom.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-start gap-3 py-3">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(next) => onToggle(rule, next)}
                  aria-label={`Enable ${rule.name}`}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => openEdit(rule)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rule.name}</p>
                    <CategoryBadge category={rule.category} />
                    <UrgencyBadge urgency={rule.urgency} />
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {ALERT_SOURCE_META[rule.source ?? "leave"].label}
                    {rule.metric ? ` · ${ALERT_METRIC_META[rule.metric].label}` : ""}
                    {rule.condition ? ` ${ALERT_CONDITION_META[rule.condition].label.toLowerCase()}` : ""}
                    {rule.threshold != null ? ` ${rule.threshold}` : ""}
                    {rule.durationValue
                      ? ` for ${rule.durationValue} ${rule.durationUnit ?? "days"}`
                      : ""}
                    {" · "}
                    {ALERT_SCOPE_META[rule.scope ?? "company"].label}
                  </p>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(rule.id)}
                  aria-label={`Delete ${rule.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomAlertSheet
        open={open}
        title={editing ? "Edit custom alert" : "New custom alert"}
        draft={draft}
        saving={saving}
        onChange={setDraft}
        onOpenChange={setOpen}
        onSave={() => void save()}
      />
      <ConfirmDialog
        open={Boolean(deleteId)}
        title={t("Delete custom alert?")}
        description="This rule will stop firing. Existing inbox items stay in history."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) await onDelete(deleteId);
          setDeleteId(null);
        }}
        onOpenChange={(next) => {
          if (!next) setDeleteId(null);
        }}
      />
    </div>
  );
}

function CustomAlertSheet({
  open,
  title,
  draft,
  saving,
  onChange,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  title: string;
  draft: CustomAlertDraft;
  saving: boolean;
  onChange: (draft: CustomAlertDraft) => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}) {
  const allowedMetrics = draft.source ? metricsForSource(draft.source) : [...ALERT_METRICS];
  const previewVars = {
    employee_name: t("Amina Hassan"),
    department: t("Field ops"),
    branch: "Cairo",
    date: t("28 Aug 2026"),
    metric_value: draft.threshold ?? draft.durationValue ?? 2,
    threshold: draft.threshold ?? 0,
    title: draft.name || "Alert",
  };

  useEffect(() => {
    if (draft.source && draft.metric && !allowedMetrics.includes(draft.metric)) {
      onChange({ ...draft, metric: allowedMetrics[0] ?? draft.metric });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.source]);

  const needsThreshold = ["above", "below", "equal", "trend_drop"].includes(
    draft.condition ?? "",
  );
  const needsDuration = ["unchanged_days", "overdue", "trend_drop"].includes(
    draft.condition ?? "",
  );

  const valid =
    draft.name.trim().length > 0 &&
    draft.titleTemplate.trim().length > 0 &&
    draft.bodyTemplate.trim().length > 0 &&
    draft.recipients.length > 0 &&
    draft.channels.length > 0 &&
    Boolean(draft.source && draft.condition && draft.metric && draft.scope) &&
    (!needsThreshold || draft.threshold != null) &&
    (!needsDuration || (draft.durationValue != null && draft.durationUnit));

  const fieldButtons = useMemo(
    () =>
      ALERT_TEMPLATE_FIELDS.map((field) => (
        <button
          key={field.key}
          type="button"
          className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted hover:text-ink"
          onClick={() =>
            onChange({
              ...draft,
              bodyTemplate: `${draft.bodyTemplate} {{${field.key}}}`.trim(),
            })
          }
        >
          {`{{${field.key}}}`}
        </button>
      )),
    [draft, onChange],
  );

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {t("Choose a source and condition, then decide who is notified and how.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="custom-name">{t("Name")}</Label>
            <Input
              id="custom-name"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-source">{t("Source")}</Label>
              <select
                id="custom-source"
                className={SELECT_CLASS}
                value={draft.source ?? "leave"}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    source: e.target.value as NonNullable<AlertRule["source"]>,
                  })
                }
              >
                {ALERT_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {ALERT_SOURCE_META[source].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-metric">{t("Metric")}</Label>
              <select
                id="custom-metric"
                className={SELECT_CLASS}
                value={draft.metric ?? allowedMetrics[0]}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    metric: e.target.value as NonNullable<AlertRule["metric"]>,
                  })
                }
              >
                {allowedMetrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {ALERT_METRIC_META[metric].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-condition">{t("Condition")}</Label>
              <select
                id="custom-condition"
                className={SELECT_CLASS}
                value={draft.condition ?? "below"}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    condition: e.target.value as NonNullable<AlertRule["condition"]>,
                  })
                }
              >
                {ALERT_CONDITIONS.map((condition) => (
                  <option key={condition} value={condition}>
                    {ALERT_CONDITION_META[condition].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-scope">{t("Scope")}</Label>
              <select
                id="custom-scope"
                className={SELECT_CLASS}
                value={draft.scope ?? "company"}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    scope: e.target.value as NonNullable<AlertRule["scope"]>,
                  })
                }
              >
                {ALERT_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {ALERT_SCOPE_META[scope].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {needsThreshold ? (
            <div className="space-y-2">
              <Label htmlFor="custom-threshold">
                {t("Threshold")}{draft.metric ? ` (${ALERT_METRIC_META[draft.metric].unit})` : ""}
              </Label>
              <Input
                id="custom-threshold"
                type="number"
                value={draft.threshold ?? ""}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    threshold: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          ) : null}
          {needsDuration ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="custom-duration">{t("For")}</Label>
                <Input
                  id="custom-duration"
                  type="number"
                  min={1}
                  value={draft.durationValue ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      durationValue:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-unit">{t("Unit")}</Label>
                <select
                  id="custom-unit"
                  className={SELECT_CLASS}
                  value={draft.durationUnit ?? "days"}
                  onChange={(e) =>
                    onChange({
                      ...draft,
                      durationUnit: e.target.value as NonNullable<
                        AlertRule["durationUnit"]
                      >,
                    })
                  }
                >
                  {ALERT_DURATION_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {ALERT_DURATION_UNIT_META[unit].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="custom-title">{t("Message title")}</Label>
            <Input
              id="custom-title"
              value={draft.titleTemplate}
              onChange={(e) => onChange({ ...draft, titleTemplate: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-body">{t("Message body")}</Label>
            <textarea
              id="custom-body"
              className={TEXTAREA_CLASS}
              value={draft.bodyTemplate}
              onChange={(e) => onChange({ ...draft, bodyTemplate: e.target.value })}
            />
            <div className="flex flex-wrap gap-1">{fieldButtons}</div>
            <div className="rounded-md bg-surface-2 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {t("Preview")}</p>
              <p className="mt-1 font-medium">
                {interpolateAlertTemplate(draft.titleTemplate, previewVars)}
              </p>
              <p className="mt-1 text-ink-muted">
                {interpolateAlertTemplate(draft.bodyTemplate, previewVars)}
              </p>
            </div>
          </div>
          <fieldset className="space-y-2">
            <Label>{t("Urgency")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {ALERT_URGENCIES.map((urgency) => (
                <button
                  key={urgency}
                  type="button"
                  onClick={() => onChange({ ...draft, urgency })}
                  className={`rounded-md border px-2 py-2 text-sm ${
                    draft.urgency === urgency
                      ? "border-primary bg-accent"
                      : "hover:bg-surface-2"
                  }`}
                >
                  {ALERT_URGENCY_META[urgency].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <Label>{t("Recipients")}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALERT_RECIPIENTS.map((recipient) => (
                <label
                  key={recipient}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={draft.recipients.includes(recipient)}
                    onChange={() =>
                      onChange({
                        ...draft,
                        recipients: toggle(draft.recipients, recipient),
                      })
                    }
                  />
                  {ALERT_RECIPIENT_META[recipient].label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <Label>{t("Channel")}</Label>
            {ALERT_CHANNELS.map((channel) => (
              <label
                key={channel}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={draft.channels.includes(channel)}
                  onChange={() =>
                    onChange({
                      ...draft,
                      channels: toggle(draft.channels, channel),
                    })
                  }
                />
                {ALERT_CHANNEL_META[channel].label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="custom-frequency">{t("Frequency")}</Label>
            <select
              id="custom-frequency"
              className={SELECT_CLASS}
              value={draft.frequency}
              onChange={(e) =>
                onChange({
                  ...draft,
                  frequency: e.target.value as AlertRule["frequency"],
                })
              }
            >
              {ALERT_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {ALERT_FREQUENCY_META[frequency].label}
                </option>
              ))}
            </select>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button disabled={!valid || saving} onClick={onSave}>
            {saving ? t("Saving…") : t("Save alert")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
