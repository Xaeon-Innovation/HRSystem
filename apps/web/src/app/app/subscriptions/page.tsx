"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/i18n";

type SubscriptionRow = {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  seatsUsed: number;
  seatLimit: number | null;
  tenant: { id: string; name: string; slug: string; status: string } | null;
  plan: { id: string; code: string; name: string } | null;
};

type PlanOption = { id: string; code: string; name: string; active: boolean };

type PendingAction =
  | { type: "cancel" | "force"; row: SubscriptionRow }
  | null;

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  async function load() {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    const data = await api<{ subscriptions: SubscriptionRow[] }>(
      `/v1/subscriptions?${params.toString()}`,
    );
    setRows(data.subscriptions);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    void api<{ plans: PlanOption[] }>("/v1/plans")
      .then((d) => setPlans(d.plans.filter((p) => p.active)))
      .catch(() => undefined);
  }, []);

  async function confirmAction() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      if (pending.type === "cancel") {
        await api(`/v1/subscriptions/${pending.row.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            cancelAtPeriodEnd: true,
            status: "canceled",
          }),
        });
      } else {
        await api(`/v1/subscriptions/${pending.row.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        });
      }
      setPending(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function changePlan(row: SubscriptionRow, planId: string) {
    if (!planId || planId === row.plan?.id) return;
    setAssigningId(row.id);
    setError(null);
    try {
      await api(`/v1/subscriptions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ planId, status: "active" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("Subscriptions")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Cross-tenant billing status, plan assignment, and overrides")}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search tenant or plan")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">{t("All statuses")}</option>
          {["trialing", "active", "past_due", "canceled", "expired"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
        <Button
          className="w-full sm:w-auto"
          variant="outline"
          onClick={() => load().catch((e) => setError(e.message))}
        >
          {t("Filter")}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="space-y-2">
        {rows.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-medium">
                  {s.tenant?.name ?? t("Unknown tenant")}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({s.tenant?.slug})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.plan?.name ?? t("No plan")} · {s.status}
                  {s.cancelAtPeriodEnd ? t(" · cancel at period end") : ""}
                  {" · "}
                  {s.seatsUsed}
                  {s.seatLimit != null ? `/${s.seatLimit}` : ""} {t("seats")}
                  {s.currentPeriodEnd
                    ? ` · ends ${new Date(s.currentPeriodEnd).toLocaleDateString()}`
                    : ""}
                  {s.tenant?.status === "suspended" ? " · tenant suspended" : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-44"
                  disabled={assigningId === s.id}
                  value={s.plan?.id ?? ""}
                  onChange={(e) => void changePlan(s, e.target.value)}
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {s.status !== "canceled" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPending({ type: "cancel", row: s })}
                  >
                    {t("Cancel")}
                  </Button>
                ) : null}
                {s.status === "past_due" ||
                s.status === "canceled" ||
                s.status === "expired" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setPending({ type: "force", row: s })}
                  >
                    {t("Force active")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("No subscriptions.")}</p>
        ) : null}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending?.type === "cancel"
            ? `Cancel subscription for “${pending.row.tenant?.name ?? "tenant"}”?`
            : pending
              ? `Force-active “${pending.row.tenant?.name ?? "tenant"}”?`
              : ""
        }
        description={
          pending?.type === "cancel"
            ? "Cancels locally (and on Polar when linked) and suspends the tenant."
            : "Sets the subscription active and unsuspends the tenant if needed. Does not recreate Polar billing."
        }
        confirmLabel={pending?.type === "cancel" ? "Cancel sub" : "Force active"}
        variant={pending?.type === "cancel" ? "destructive" : "default"}
        busy={busy}
        onConfirm={confirmAction}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      />
    </div>
  );
}
