"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Chip,
  EmptyState,
  Notice,
  PageHeader,
  StatusChip,
} from "@/components/elevora";
import { CreditCard } from "lucide-react";
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
      <PageHeader
        title={t("Subscriptions")}
        subtitle={t("Cross-tenant status")}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search tenant or plan")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-10 rounded-sm border border-line-strong bg-surface px-3 text-sm text-ink"
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

      {error ? <Notice tone="warn">{error}</Notice> : null}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-5 w-5" aria-hidden />}
            title={t("No subscriptions")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-line text-start text-2xs text-ink-muted">
                  <th className="px-5 py-3 font-medium">{t("Tenant")}</th>
                  <th className="px-3 py-3 font-medium">{t("Plan")}</th>
                  <th className="px-3 py-3 font-medium tabular">{t("Seats")}</th>
                  <th className="px-3 py-3 font-medium">{t("Period end")}</th>
                  <th className="px-3 py-3 font-medium">{t("Status")}</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 align-middle">
                      <b className="text-ink">{s.tenant?.name ?? t("Unknown tenant")}</b>
                      <p className="text-2xs text-ink-muted">
                        {s.tenant?.slug}
                        {s.cancelAtPeriodEnd
                          ? t(" · cancel at period end")
                          : ""}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <Chip>{s.plan?.name ?? t("No plan")}</Chip>
                    </td>
                    <td className="px-3 py-3 align-middle tabular text-ink">
                      {s.seatsUsed}
                      {s.seatLimit != null ? `/${s.seatLimit}` : ""}
                    </td>
                    <td className="px-3 py-3 align-middle tabular text-xs text-ink-muted">
                      {s.currentPeriodEnd
                        ? new Date(s.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <StatusChip status={s.status} label={s.status} />
                    </td>
                    <td className="px-5 py-3 align-middle">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                        <select
                          className="h-9 w-full rounded-sm border border-line-strong bg-surface px-2 text-sm sm:w-44"
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
                            onClick={() =>
                              setPending({ type: "cancel", row: s })
                            }
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
                            onClick={() =>
                              setPending({ type: "force", row: s })
                            }
                          >
                            {t("Force active")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
