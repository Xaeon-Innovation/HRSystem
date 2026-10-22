"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  AccentCard,
  Chip,
  Notice,
  PageHeader,
} from "@/components/elevora";
import { ExternalLink } from "lucide-react";
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

  if (error && !data) {
    return <Notice tone="warn">{error}</Notice>;
  }
  if (!data) return <PageSkeleton />;

  const currentPacks = packSummary(data.plan?.features);
  const currentQuote =
    data.plan && isSeatQuoteCode(data.plan.code)
      ? quotes[data.plan.code]
      : null;

  const monthlyPrice =
    data.plan && isSeatQuoteCode(data.plan.code) && data.purchasedSeats != null
      ? formatMoney(
          quoteForSeats(data.plan.code as SeatQuoteCode, data.purchasedSeats),
          data.plan.currency,
        )
      : data.plan
        ? formatMoney(data.plan.amountCents, data.plan.currency)
        : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Billing")}
        subtitle={t("Plan, seats and renewal.")}
        actions={
          data.subscription?.polarCustomerId ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy || !data.polarConfigured}
              onClick={() => void openPortal()}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              {t("Billing portal")}
            </Button>
          ) : null
        }
      />
      {message ? <Notice tone="accent">{message}</Notice> : null}
      {error ? <Notice tone="warn">{error}</Notice> : null}

      {!data.polarConfigured ? (
        <Notice tone="warn">
          {t(
            "Online checkout is not configured yet. Contact platform support to upgrade.",
          )}
        </Notice>
      ) : null}

      <div className="grid gap-3.5 lg:grid-cols-12">
        <Card className="min-w-0 overflow-hidden lg:col-span-5">
          <AccentCard className="rounded-none border-0 shadow-none">
            <div className="relative z-[1] flex items-start justify-between gap-2">
              <b className="text-sm">{t("Current plan")}</b>
              {data.subscription?.status ? (
                <Chip tone="ink">{data.subscription.status}</Chip>
              ) : null}
            </div>
            <div className="relative z-[1] mt-3 text-stat-lg font-semibold tracking-tight">
              {data.plan?.name ?? t("None")}
            </div>
            {currentPacks ? (
              <p className="relative z-[1] mt-1 text-sm opacity-80">
                {currentPacks}
              </p>
            ) : null}
            <div className="relative z-[1] mt-4 flex flex-wrap gap-4">
              <div>
                <div className="text-2xs opacity-75">{t("Seats")}</div>
                <b className="tabular">
                  {data.seatsUsed}
                  {data.seatLimit != null ? ` / ${data.seatLimit}` : ""}
                </b>
              </div>
              <div>
                <div className="text-2xs opacity-75">{t("Renews")}</div>
                <b className="tabular">
                  {data.subscription?.currentPeriodEnd
                    ? new Date(
                        data.subscription.currentPeriodEnd,
                      ).toLocaleDateString()
                    : "—"}
                </b>
              </div>
              <div>
                <div className="text-2xs opacity-75">{t("Monthly")}</div>
                <b className="tabular">{monthlyPrice}</b>
              </div>
            </div>
          </AccentCard>
          <CardContent className="space-y-3">
            {canChangeSeats && currentQuote && seatDraft != null ? (
              <>
                <SeatSlider
                  seats={seatDraft}
                  quote={currentQuote}
                  currency={data.plan!.currency}
                  planCode={data.plan!.code as SeatQuoteCode}
                  onChange={setSeatDraft}
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="w-full flex-1"
                    disabled={
                      busy ||
                      seatDraft === data.purchasedSeats ||
                      seatDraft < data.seatsUsed
                    }
                    onClick={() => setSeatConfirmOpen(true)}
                  >
                    {t("Update seats")}
                  </Button>
                  {data.subscription && !data.subscription.cancelAtPeriodEnd ? (
                    <Button
                      variant="destructive"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() => setCancelOpen(true)}
                    >
                      {t("Cancel at period end")}
                    </Button>
                  ) : null}
                </div>
              </>
            ) : data.subscription && !data.subscription.cancelAtPeriodEnd ? (
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => setCancelOpen(true)}
              >
                {t("Cancel at period end")}
              </Button>
            ) : data.subscription?.cancelAtPeriodEnd ? (
              <Notice tone="warn">{t("Cancels at period end")}</Notice>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-3.5 sm:grid-cols-2 lg:col-span-7">
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
            const isCurrent = data.plan?.id === p.id;
            const isEnterprise = p.code === "enterprise";
            return (
              <Card key={p.id} className="flex min-w-0 flex-col">
                <CardContent className="flex flex-1 flex-col gap-2 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <b className="text-sm text-ink">{p.name}</b>
                    {isCurrent ? <Chip tone="ok">{t("Current")}</Chip> : null}
                  </div>
                  <div className="text-lg font-semibold tabular text-ink">
                    {isEnterprise && p.amountCents === 0
                      ? t("Custom")
                      : formatMoney(displayCents, p.currency)}
                    {!isEnterprise || p.amountCents > 0 ? (
                      <span className="text-2xs font-normal text-ink-muted">
                        {" "}
                        /{t("seat")}/{t("mo")}
                      </span>
                    ) : null}
                  </div>
                  {packs ? (
                    <p className="text-xs text-ink-muted">{packs}</p>
                  ) : p.description ? (
                    <p className="text-xs text-ink-muted">{p.description}</p>
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
                  <div className="mt-auto pt-2">
                    {isEnterprise ? (
                      <Button asChild variant="outline" className="w-full">
                        <a href="/demo">{t("Talk to sales")}</a>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={
                          busy ||
                          !data.polarConfigured ||
                          !p.polarProductId ||
                          isCurrent
                        }
                        onClick={() => void checkout(p.id, p.code)}
                      >
                        {isCurrent ? t("Current") : t("Switch plan")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="min-w-0 lg:col-span-12">
          <CardHeader>
            <CardTitle className="text-base">{t("Invoices")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-ink-muted">
              {t("Open the billing portal for invoices and receipts.")}
            </p>
          </CardContent>
        </Card>
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
