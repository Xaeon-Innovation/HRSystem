"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Circle,
  ClipboardList,
  MapPinned,
  Palette,
  Sparkles,
  Timer,
  Users,
  Bell,
  Palmtree,
  Briefcase,
} from "lucide-react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

type StepId =
  | "branding"
  | "branches"
  | "job_roles"
  | "skills"
  | "employees"
  | "presence"
  | "shifts"
  | "leave"
  | "alerts";

type SetupStep = {
  id: StepId;
  done: boolean;
  required: boolean;
  href: string;
  count?: number;
};

type SetupStatus = {
  dismissed: boolean;
  steps: SetupStep[];
  progress: {
    doneRequired: number;
    totalRequired: number;
    doneAll: number;
    totalAll: number;
    pct: number;
    allRequiredDone: boolean;
  };
};

const STEP_META: Record<
  StepId,
  { title: string; hint: string; icon: typeof Palette }
> = {
  branding: {
    title: "Brand workspace",
    hint: "Set your display name, logo, or color preset so the app feels like yours.",
    icon: Palette,
  },
  branches: {
    title: "Branches & sites",
    hint: "Add at least one branch (and sites if you have multiple locations).",
    icon: Building2,
  },
  job_roles: {
    title: "Job roles",
    hint: "Create roles with descriptions so you can assign people correctly.",
    icon: Briefcase,
  },
  skills: {
    title: "Skills catalog",
    hint: "Add skills here, then mark which ones each job role requires.",
    icon: Sparkles,
  },
  employees: {
    title: "Add employees",
    hint: "Import CSV or add people, then share their temporary passwords.",
    icon: Users,
  },
  presence: {
    title: "Presence & work zones",
    hint: "Set each person to mobile field work, or give fixed-zone staff a geofence.",
    icon: MapPinned,
  },
  shifts: {
    title: "Shift patterns",
    hint: "Create at least one active pattern so schedules, lateness, and OT work.",
    icon: Timer,
  },
  leave: {
    title: "Review leave policies",
    hint: "Defaults are seeded — open policies, adjust for your country, then mark reviewed.",
    icon: Palmtree,
  },
  alerts: {
    title: "Alert rules",
    hint: "Optional: turn on the notifications you care about, or mark when reviewed.",
    icon: Bell,
  },
};

function canSeeSetup(): boolean {
  const user = getUser();
  if (!user?.tenantId) return false;
  return user.role === "tenant_admin" || user.role === "super_admin";
}

export function SetupChecklist({
  className,
}: {
  className?: string;
}) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forceShow, setForceShow] = useState(false);
  const visible = canSeeSetup();

  const load = useCallback(() => {
    if (!visible) return;
    api<SetupStatus>("/v1/admin/setup-status", { skipCache: true })
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, [visible]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchChecklist(body: {
    leaveReviewed?: true;
    alertsReviewed?: true;
    dismissed?: boolean;
  }) {
    setBusy(true);
    setError(null);
    try {
      await api("/v1/admin/setup-checklist", {
        method: "PATCH",
        body: JSON.stringify(body),
        skipCache: true,
      });
      if (body.dismissed === false) setForceShow(true);
      if (body.dismissed === true) setForceShow(false);
      const next = await api<SetupStatus>("/v1/admin/setup-status", {
        skipCache: true,
      });
      setStatus(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;
  if (!status && !error) return null;

  if (error && !status) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {t(error)}
      </p>
    );
  }
  if (!status) return null;

  const hidden =
    (status.dismissed || status.progress.allRequiredDone) && !forceShow;

  if (hidden) {
    return (
      <div className={cn("flex justify-end", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto px-0 text-xs text-muted-foreground hover:text-foreground"
          disabled={busy}
          onClick={() => {
            if (status.dismissed) void patchChecklist({ dismissed: false });
            else setForceShow(true);
          }}
        >
          {t("Show setup guide")}
        </Button>
      </div>
    );
  }

  const { progress, steps } = status;
  const nextOpen = steps.find((s) => !s.done);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card",
        className,
      )}
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-base font-semibold tracking-tight text-card-title sm:text-lg">
                {t("Getting started")}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {t(
                "Finish these once so roster, clock, leave, and skills work without hunting Settings.",
              )}
            </p>
          </div>
          <div className="shrink-0 text-start sm:text-end">
            <p className="text-2xl font-semibold tabular-nums tracking-tight">
              {progress.pct}%
            </p>
            <p className="text-xs text-muted-foreground">
              {t("{done} of {total} required", {
                done: progress.doneRequired,
                total: progress.totalRequired,
              })}
            </p>
          </div>
        </div>

        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("Setup progress")}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress.pct}%` }}
          />
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {t(error)}
          </p>
        ) : null}

        {progress.allRequiredDone ? (
          <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">
                  {t("Foundation ready")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Required setup is complete. You can dismiss this guide anytime.",
                  )}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void patchChecklist({ dismissed: true })}
            >
              {t("Dismiss")}
            </Button>
          </div>
        ) : null}

        <ul className="space-y-2">
          {steps.map((step) => {
            const meta = STEP_META[step.id];
            const Icon = meta.icon;
            const markable =
              (step.id === "leave" || step.id === "alerts") && !step.done;

            return (
              <li
                key={step.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
                  step.done
                    ? "border-emerald-500/25 bg-emerald-500/5"
                    : nextOpen?.id === step.id
                      ? "border-primary/35 bg-primary/5"
                      : "border-border/80 bg-background/40",
                )}
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  {step.done ? (
                    <CheckCircle2
                      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <p className="font-medium text-foreground">
                        {t(meta.title)}
                      </p>
                      {!step.required ? (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {t("Optional")}
                        </span>
                      ) : null}
                      {typeof step.count === "number" && step.count > 0 ? (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          ({step.count})
                        </span>
                      ) : null}
                    </div>
                    {!step.done ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t(meta.hint)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {!step.done ? (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {markable ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={busy}
                        onClick={() =>
                          void patchChecklist(
                            step.id === "leave"
                              ? { leaveReviewed: true }
                              : { alertsReviewed: true },
                          )
                        }
                      >
                        {t("Mark reviewed")}
                      </Button>
                    ) : null}
                    <Button
                      asChild
                      size="sm"
                      variant={nextOpen?.id === step.id ? "default" : "outline"}
                      className="w-full sm:w-auto"
                    >
                      <Link href={step.href}>{t("Open")}</Link>
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
