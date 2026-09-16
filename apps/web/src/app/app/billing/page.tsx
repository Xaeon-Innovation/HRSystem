"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/i18n";
import {
  derivePackFlags,
  isSeatQuoteCode,
  quoteForSeats,
  SEAT_QUOTES,
  type ModuleKey,
  type SeatQuote,
  type SeatQuoteCode,
} from "@hr/shared";

type PlanFeatures = Record<string, boolean | number | string>;

type BillingCurrent = {
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    polarSubscriptionId?: string | null;
    polarCustomerId?: string | null;
    purchasedSeats?: number | null;
  } | null;
  plan: {
    id: string;
    code: string;
    name: string;
    amountCents: number;
    currency: string;
    seatLimit: number | null;
    features?: PlanFeatures;
  } | null;
  seatsUsed: number;
  seatLimit: number | null;
  purchasedSeats: number | null;
  accessAllowed: boolean;
  polarConfigured: boolean;
  seatQuotes: Record<SeatQuoteCode, SeatQuote>;
  availablePlans: Array<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    amountCents: number;
    currency: string;
    seatLimit: number | null;
    polarProductId: string | null;
    features?: PlanFeatures;
  }>;
};

function packSummary(features?: PlanFeatures): string {
  if (!features) return "";
  const packs = derivePackFlags(
    features as Partial<Record<ModuleKey, boolean>>,
  );
  const labels: string[] = [];
  if (packs.fieldOps) labels.push(t("Field ops"));
  if (packs.peopleOps) labels.push(t("People ops"));
  if (packs.analytics) labels.push(t("Analytics"));
  if (packs.integrations) labels.push(t("Integrations"));
  return labels.join(" · ");
}

function formatMoney(amountCents: number, currency: string) {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
}

function SeatSlider({
  seats,
  quote,
  currency,
  planCode,
  onChange,
}: {
  seats: number;
  quote: SeatQuote;
  currency: string;
  planCode: SeatQuoteCode;
  onChange: (n: number) => void;
}) {
  const pct = ((seats - quote.min) / (quote.max - quote.min)) * 100;
  return (
    <div className="mt-2 w-full space-y-2 sm:max-w-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium">{t("Seats")}</span>
        <span className="text-sm font-semibold tabular-nums">{seats}</span>
      </div>
      <input
        type="range"
        min={quote.min}
        max={quote.max}
        step={quote.step}
        value={seats}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2.5 w-full cursor-pointer appearance-none rounded-full accent-primary"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--border)) ${pct}%, hsl(var(--border)) 100%)`,
        }}
        aria-label={t("Seats")}
      />
      <p className="text-[10px] text-muted-foreground">
        {formatMoney(quoteForSeats(planCode, seats), currency)}
        {t("/mo")}
      </p>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingCurrent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [seatConfirmOpen, setSeatConfirmOpen] = useState(false);
  const [seatDraft, setSeatDraft] = useState<number | null>(null);
  const [checkoutSeats, setCheckoutSeats] = useState<Record<string, number>>(
    {},
  );
  const [autoCheckoutStarted, setAutoCheckoutStarted] = useState(false);

  async function load() {
    const current = await api<BillingCurrent>("/v1/billing/current");
    setData(current);
    const next: Record<string, number> = {};
    for (const p of current.availablePlans) {
      if (isSeatQuoteCode(p.code)) {
        const q = current.seatQuotes?.[p.code] ?? SEAT_QUOTES[p.code];
        next[p.code] = Math.min(
          q.max,
          Math.max(q.min, p.seatLimit ?? q.included),
        );
      }
    }
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const intentSeats = params?.get("seats");
    const intentPlan = params?.get("checkout");
    if (
      intentPlan &&
      isSeatQuoteCode(intentPlan) &&
      intentSeats &&
      Number.isFinite(Number(intentSeats))
    ) {
      next[intentPlan] = Number(intentSeats);
    }
    setCheckoutSeats(next);
    if (
      current.purchasedSeats != null &&
      current.plan &&
      isSeatQuoteCode(current.plan.code)
    ) {
      setSeatDraft(current.purchasedSeats);
    }
    return current;
  }

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("checkout") === "done"
    ) {
      setMessage(
        t("Checkout completed. Status will update after Polar confirms."),
      );
    }
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!data || autoCheckoutStarted || !data.polarConfigured) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("checkout");
    if (!intent || intent === "done") return;
    const plan = data.availablePlans.find((p) => p.code === intent);
    if (!plan) return;
    setAutoCheckoutStarted(true);
    const seatsRaw = params.get("seats");
    const seatsOverride =
      isSeatQuoteCode(intent) &&
      seatsRaw &&
      Number.isFinite(Number(seatsRaw))
        ? Number(seatsRaw)
        : undefined;
    if (seatsOverride != null) {
      setCheckoutSeats((prev) => ({
        ...prev,
        [intent]: seatsOverride,
      }));
    }
    void checkout(plan.id, plan.code, seatsOverride);
  }, [data, autoCheckoutStarted]);

  const quotes = data?.seatQuotes ?? SEAT_QUOTES;

  const canChangeSeats = useMemo(() => {
    return Boolean(
      data?.plan &&
        isSeatQuoteCode(data.plan.code) &&
        data.subscription?.polarSubscriptionId &&
        !data.subscription.cancelAtPeriodEnd,
    );
  }, [data]);

  async function checkout(
    planId: string,
    code: string,
    seatsOverride?: number,
  ) {
    setBusy(true);
    setError(null);
    try {
      const body: { planId: string; seats?: number } = { planId };
      if (isSeatQuoteCode(code)) {
        body.seats =
          seatsOverride ??
          checkoutSeats[code] ??
          quotes[code].included;
      }
      const res = await api<{ checkoutUrl: string }>("/v1/billing/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      });
      window.location.href = res.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Checkout failed"));
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setBusy(true);
    try {
      await api("/v1/billing/cancel", { method: "POST", body: "{}" });
      setMessage(t("Subscription will cancel at period end."));
      setCancelOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Cancel failed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmSeats() {
    if (seatDraft == null) return;
    setBusy(true);
    setError(null);
    try {
      await api("/v1/billing/seats", {
        method: "POST",
        body: JSON.stringify({ seats: seatDraft }),
      });
      setMessage(t("Seat count updated."));
      setSeatConfirmOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Seat update failed"));
    } finally {
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ portalUrl: string }>("/v1/billing/portal", {
        method: "POST",
        body: "{}",
      });
      window.location.href = res.portalUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Portal failed"));
      setBusy(false);
    }
  }

  if (error && !data) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  const currentPacks = packSummary(data.plan?.features);
  const currentQuote =
    data.plan && isSeatQuoteCode(data.plan.code)
      ? quotes[data.plan.code]
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{t("Billing")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Manage your organization subscription")}
          </p>
        </div>
        {data.subscription?.polarCustomerId ? (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy || !data.polarConfigured}
            onClick={() => void openPortal()}
          >
            {t("Billing portal")}
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Current plan")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              {data.plan?.name ?? t("None")}{" "}
              <span className="text-muted-foreground">
                ({data.subscription?.status ?? "n/a"})
              </span>
            </p>
            {currentPacks ? (
              <p className="mt-1 text-xs text-muted-foreground">{currentPacks}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Seats")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.seatsUsed}
            {data.seatLimit != null ? ` / ${data.seatLimit}` : t(" / unlimited")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Renews / ends")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {data.subscription?.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString()
              : "-"}
          </CardContent>
        </Card>
      </div>

      {canChangeSeats && currentQuote && seatDraft != null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Change seats")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <SeatSlider
                seats={seatDraft}
                quote={currentQuote}
                currency={data.plan!.currency}
                planCode={data.plan!.code as SeatQuoteCode}
                onChange={setSeatDraft}
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              disabled={
                busy ||
                seatDraft === data.purchasedSeats ||
                seatDraft < data.seatsUsed
              }
              onClick={() => setSeatConfirmOpen(true)}
            >
              {t("Update seats")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data.subscription && !data.subscription.cancelAtPeriodEnd ? (
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => setCancelOpen(true)}
        >
          {t("Cancel at period end")}
        </Button>
      ) : null}

      {!data.polarConfigured ? (
        <p className="text-sm text-muted-foreground">
          {t(
            "Online checkout is not configured yet. Contact platform support to upgrade.",
          )}
        </p>
      ) : null}

      <div>
        <h2 className="mb-2 text-lg font-medium">{t("Available plans")}</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          {t(
            "Field and People packs can be bought alone. Ops and Scale bundle both with larger seat bands.",
          )}
        </p>
        <div className="space-y-2">
          {data.availablePlans.map((p) => {
            const packs = packSummary(p.features);
            const quote = isSeatQuoteCode(p.code) ? quotes[p.code] : null;
            const seats = quote
              ? (checkoutSeats[p.code] ?? quote.included)
              : null;
            const displayCents =
              quote && seats != null
                ? quoteForSeats(p.code as SeatQuoteCode, seats)
                : p.amountCents;
            return (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(displayCents, p.currency)}
                      {t("/mo · seats")}{" "}
                      {seats != null ? seats : (p.seatLimit ?? "∞")}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                    {packs ? (
                      <p className="mt-1 text-xs text-muted-foreground">{packs}</p>
                    ) : null}
                    {quote ? (
                      <SeatSlider
                        seats={seats!}
                        quote={quote}
                        currency={p.currency}
                        planCode={p.code as SeatQuoteCode}
                        onChange={(n) =>
                          setCheckoutSeats((prev) => ({
                            ...prev,
                            [p.code]: n,
                          }))
                        }
                      />
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={
                      busy ||
                      !data.polarConfigured ||
                      !p.polarProductId ||
                      data.plan?.id === p.id
                    }
                    onClick={() => void checkout(p.id, p.code)}
                  >
                    {data.plan?.id === p.id ? t("Current") : t("Subscribe")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t("Need more than 150 seats?")}{" "}
          <a
            href="/demo"
            className="text-primary underline-offset-2 hover:underline"
          >
            {t("Request an Enterprise demo")}
          </a>
        </p>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel subscription?"
        description="Your plan stays active until the end of the current billing period."
        confirmLabel="Cancel subscription"
        variant="destructive"
        busy={busy}
        onConfirm={confirmCancel}
        onOpenChange={(open) => {
          if (!open && !busy) setCancelOpen(false);
        }}
      />

      <ConfirmDialog
        open={seatConfirmOpen}
        title="Update seat count?"
        description="Polar will prorate the charge or credit for the rest of this billing period."
        confirmLabel="Update seats"
        busy={busy}
        onConfirm={confirmSeats}
        onOpenChange={(open) => {
          if (!open && !busy) setSeatConfirmOpen(false);
        }}
      />
    </div>
  );
}
