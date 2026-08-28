"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { SELECT_CLASS } from "@/lib/alerts/format";
import type { AlertRule } from "@/lib/alerts/types";
import {
  ALERT_CHANNELS,
  ALERT_CHANNEL_META,
  ALERT_FREQUENCIES,
  ALERT_FREQUENCY_META,
  ALERT_RECIPIENTS,
  ALERT_RECIPIENT_META,
  ALERT_URGENCIES,
  ALERT_URGENCY_META,
  getCatalogAlert,
} from "@hr/shared";
import { CategoryBadge, UrgencyBadge } from "@/components/alerts/alert-badges";

export function AlertRuleSheet({
  rule,
  open,
  saving,
  onOpenChange,
  onSave,
}: {
  rule: AlertRule | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<AlertRule>) => Promise<void>;
}) {
  const [draft, setDraft] = useState<AlertRule | null>(rule);

  useEffect(() => {
    setDraft(rule);
  }, [rule]);

  if (!draft) return null;
  const catalog = getCatalogAlert(draft.eventKey);

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{draft.name}</SheetTitle>
          <SheetDescription>
            {draft.description ?? catalog?.description}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={draft.category} />
            <UrgencyBadge urgency={draft.urgency} />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-secondary/40 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Enabled</p>
              <p className="text-xs text-muted-foreground">
                Off events stay configured but never notify.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(enabled) => setDraft({ ...draft, enabled })}
              aria-label="Enable alert"
            />
          </div>
          <fieldset className="space-y-2">
            <Label>Urgency</Label>
            <div className="grid grid-cols-3 gap-2">
              {ALERT_URGENCIES.map((urgency) => (
                <button
                  key={urgency}
                  type="button"
                  onClick={() => setDraft({ ...draft, urgency })}
                  className={`rounded-md border px-2 py-2 text-sm ${
                    draft.urgency === urgency
                      ? "border-primary bg-accent"
                      : "hover:bg-secondary"
                  }`}
                >
                  {ALERT_URGENCY_META[urgency].label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <Label>Recipients</Label>
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
                      setDraft({
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
            <Label>Channel</Label>
            <div className="space-y-2">
              {ALERT_CHANNELS.map((channel) => (
                <label
                  key={channel}
                  className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={draft.channels.includes(channel)}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        channels: toggle(draft.channels, channel),
                      })
                    }
                  />
                  <span>
                    <span className="font-medium">{ALERT_CHANNEL_META[channel].label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ALERT_CHANNEL_META[channel].hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="alert-frequency">Frequency</Label>
            <select
              id="alert-frequency"
              className={SELECT_CLASS}
              value={draft.frequency}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  frequency: e.target.value as AlertRule["frequency"],
                })
              }
            >
              {ALERT_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {ALERT_FREQUENCY_META[frequency].label} —{" "}
                  {ALERT_FREQUENCY_META[frequency].hint}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="alert-escalate">Escalate after (hours)</Label>
            <Input
              id="alert-escalate"
              type="number"
              min={1}
              max={720}
              placeholder="Leave empty for no escalation"
              value={draft.escalateAfterHours ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  escalateAfterHours: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Remind the next recipient if nobody acts. Typical for pending
              approvals and overdue reviews.
            </p>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={saving || draft.recipients.length === 0 || draft.channels.length === 0}
            onClick={() =>
              void onSave(draft.id, {
                enabled: draft.enabled,
                urgency: draft.urgency,
                channels: draft.channels,
                frequency: draft.frequency,
                recipients: draft.recipients,
                escalateAfterHours: draft.escalateAfterHours,
              })
            }
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
