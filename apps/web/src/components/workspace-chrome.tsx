"use client";

import { useEffect, useState } from "react";
import { api, setSession, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

type PlanOption = { id: string; code: string; name: string; active: boolean };

type EnterResult = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

/**
 * Banner + controls while a super_admin is inside a tenant workspace.
 */
export function WorkspaceChrome({
  user,
  onUserChange,
}: {
  user: AuthUser;
  onUserChange: (u: AuthUser) => void;
}) {
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active =
    user.role === "super_admin" && Boolean(user.tenantId);

  useEffect(() => {
    if (!active) return;
    void api<{ plans: PlanOption[] }>("/v1/plans")
      .then((d) => setPlans(d.plans.filter((p) => p.active)))
      .catch(() => undefined);
  }, [active]);

  if (!active) return null;

  const workspace = user.workspace;

  async function applySession(res: EnterResult) {
    setSession(res.accessToken, res.refreshToken, res.user);
    onUserChange(res.user);
  }

  async function setMode(
    mode: "unlock_all" | "as_entitled" | "preview_plan",
    previewPlanId?: string | null,
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<EnterResult>("/v1/platform/workspace-preview", {
        method: "PATCH",
        body: JSON.stringify({
          workspaceMode: mode,
          previewPlanId: mode === "preview_plan" ? previewPlanId : null,
        }),
      });
      await applySession(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function exitWorkspace() {
    setBusy(true);
    try {
      const res = await api<EnterResult>("/v1/platform/exit-tenant", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSession(res.accessToken, res.refreshToken, res.user);
      onUserChange(res.user);
      window.location.href = "/app/tenants";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(false);
    }
  }

  const mode = workspace?.mode ?? "unlock_all";
  const label =
    mode === "preview_plan"
      ? `Previewing ${workspace?.previewPlanName ?? workspace?.previewPlanCode ?? "plan"} — catalog live`
      : mode === "as_entitled"
        ? `As entitled — ${workspace?.tenantName ?? "tenant"}`
        : `Unlock all — ${workspace?.tenantName ?? "tenant"}`;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="min-w-0 font-medium text-amber-950 dark:text-amber-100">
          {label}
          {workspace?.platformLab ? (
            <span className="ml-2 text-xs font-normal opacity-80">
              ({t("Lab")})
            </span>
          ) : null}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-auto"
            disabled={busy}
            value={mode}
            onChange={(e) => {
              const next = e.target.value as typeof mode;
              if (next === "preview_plan") {
                const first = plans[0]?.id ?? workspace?.previewPlanId;
                void setMode("preview_plan", first);
              } else {
                void setMode(next);
              }
            }}
          >
            <option value="unlock_all">{t("Unlock all")}</option>
            <option value="as_entitled">{t("As entitled")}</option>
            <option value="preview_plan">{t("Preview plan")}</option>
          </select>
          {mode === "preview_plan" ? (
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-auto"
              disabled={busy}
              value={workspace?.previewPlanId ?? ""}
              onChange={(e) => void setMode("preview_plan", e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => void exitWorkspace()}
          >
            {t("Exit workspace")}
          </Button>
        </div>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Helper used by Features / Plans pages to open Lab as a plan preview. */
export async function enterPlanPreview(planId: string) {
  const lab = await api<{ id: string }>("/v1/platform/lab");
  const res = await api<EnterResult>("/v1/platform/enter-tenant", {
    method: "POST",
    body: JSON.stringify({
      tenantId: lab.id,
      workspaceMode: "preview_plan",
      previewPlanId: planId,
    }),
  });
  setSession(res.accessToken, res.refreshToken, res.user);
  window.location.href = "/app";
}

export async function enterLabUnlockAll() {
  const lab = await api<{ id: string }>("/v1/platform/lab");
  const res = await api<EnterResult>("/v1/platform/enter-tenant", {
    method: "POST",
    body: JSON.stringify({
      tenantId: lab.id,
      workspaceMode: "unlock_all",
    }),
  });
  setSession(res.accessToken, res.refreshToken, res.user);
  window.location.href = "/app";
}
