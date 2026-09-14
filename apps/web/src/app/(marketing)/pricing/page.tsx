"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type PublicPlan = {
  code: string;
  name: string;
  description: string | null;
  amountCents: number;
  currency: string;
  intervalDays: number;
  seatLimit: number | null;
  features: Record<string, unknown>;
};

const FALLBACK_PLANS: PublicPlan[] = [
  {
    code: "field",
    name: "Field",
    description: "Clock, live map, and field presence for crews",
    amountCents: 11900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    features: {
      fieldOps: true,
      peopleOps: false,
      analytics: false,
      integrations: false,
      pingIntervalSec: 60,
      locationRetentionDays: 30,
    },
  },
  {
    code: "people",
    name: "People",
    description: "Leave, KPIs, hiring, and compensation for HR teams",
    amountCents: 8900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    features: {
      fieldOps: false,
      peopleOps: true,
      analytics: false,
      integrations: false,
      pingIntervalSec: 60,
      locationRetentionDays: 30,
    },
  },
  {
    code: "ops",
    name: "Ops",
    description: "Field + people ops with analytics for growing teams",
    amountCents: 24900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 50,
    features: {
      fieldOps: true,
      peopleOps: true,
      analytics: true,
      integrations: false,
      pingIntervalSec: 30,
      locationRetentionDays: 60,
    },
  },
  {
    code: "scale",
    name: "Scale",
    description: "Full platform with integrations and priority support",
    amountCents: 59900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 150,
    features: {
      fieldOps: true,
      peopleOps: true,
      analytics: true,
      integrations: true,
      pingIntervalSec: 20,
      locationRetentionDays: 90,
    },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Custom seats, SLA, and dedicated support — talk to sales",
    amountCents: 0,
    currency: "USD",
    intervalDays: 30,
    seatLimit: null,
    features: {
      fieldOps: true,
      peopleOps: true,
      analytics: true,
      integrations: true,
      pingIntervalSec: 15,
      locationRetentionDays: 90,
    },
  },
];

const PLAN_ORDER = ["field", "people", "ops", "scale", "enterprise"] as const;

/**
 * Floor + overage seat quotes (marketing). Keeps the ladder honest:
 * - Fewer seats never discount below list (Ops $249 / Scale $599).
 * - Scale starts at 100 seats so it cannot undercut Ops at the same headcount.
 * - Extra seats above the included band cost more than the next tier's floor.
 */
type SeatQuote = {
  min: number;
  max: number;
  step: number;
  included: number;
  floorCents: number;
  overageCents: number;
};

const SEAT_QUOTES: Record<"ops" | "scale", SeatQuote> = {
  ops: {
    min: 25,
    max: 100,
    step: 5,
    included: 50,
    floorCents: 24900,
    overageCents: 600, // $6 / seat above 50 → 100 seats = $549 (< Scale floor)
  },
  scale: {
    min: 100,
    max: 250,
    step: 10,
    included: 150,
    floorCents: 59900,
    overageCents: 450, // $4.50 / seat above 150
  },
};

function quoteForSeats(code: "ops" | "scale", seats: number): number {
  const q = SEAT_QUOTES[code];
  const clamped = Math.min(q.max, Math.max(q.min, seats));
  if (clamped <= q.included) return q.floorCents;
  return q.floorCents + (clamped - q.included) * q.overageCents;
}

function formatMoney(
  amountCents: number,
  currency: string,
  t: (s: string) => string,
) {
  const amount = (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
  // Isolate the amount so Arabic "/شهر" does not BiDi-reorder as "شهر/$119".
  return (
    <span dir="ltr" className="inline-block tabular-nums">
      {amount}
      {t("/mo")}
    </span>
  );
}

function formatPrice(
  plan: PublicPlan,
  t: (s: string) => string,
  seats?: number,
) {
  if (plan.code === "enterprise" || plan.amountCents === 0) {
    return t("Custom");
  }
  if (
    seats != null &&
    (plan.code === "ops" || plan.code === "scale") &&
    SEAT_QUOTES[plan.code]
  ) {
    return formatMoney(quoteForSeats(plan.code, seats), plan.currency, t);
  }
  return formatMoney(plan.amountCents, plan.currency, t);
}

function quoteHint(
  code: "ops" | "scale",
  seats: number,
  t: (s: string, v?: Record<string, string | number>) => string,
): string {
  const q = SEAT_QUOTES[code];
  if (seats <= q.included) {
    return t("Plan price · up to {n} seats included", { n: q.included });
  }
  const extra = seats - q.included;
  const rate = `$${(q.overageCents / 100).toFixed(2)}`;
  return t("+{extra} seats at {rate} each", { extra, rate });
}

function featureLines(
  plan: PublicPlan,
  t: (s: string, v?: Record<string, string | number>) => string,
  skipSeats: boolean,
): string[] {
  const lines: string[] = [];
  if (!skipSeats) {
    if (plan.code === "enterprise" || plan.seatLimit == null) {
      lines.push(t("150+ seats (custom)"));
    } else {
      lines.push(t("Up to {n} seats", { n: plan.seatLimit }));
    }
  }
  if (plan.features?.fieldOps) {
    lines.push(t("Field ops: clock, live map, GPS presence"));
  } else {
    lines.push(t("Clock-in without live GPS trail"));
  }
  if (plan.features?.peopleOps) {
    lines.push(t("People ops: leave, KPIs, hiring, compensation"));
  }
  if (plan.features?.analytics) {
    lines.push(t("Analytics dashboards"));
  }
  if (plan.features?.integrations) {
    lines.push(t("Integrations hub"));
  }
  const ping = plan.features?.pingIntervalSec;
  if (plan.features?.fieldOps && typeof ping === "number") {
    lines.push(t("GPS every {n}s", { n: ping }));
  }
  if (plan.code === "scale" || plan.code === "enterprise") {
    lines.push(t("Priority support"));
  }
  if (plan.code === "enterprise") {
    lines.push(t("SLA and custom retention"));
  }
  return lines;
}

function SeatSlider({
  seats,
  min,
  max,
  step,
  onChange,
  t,
}: {
  seats: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  t: (s: string, v?: Record<string, string | number>) => string;
}) {
  const pct = ((seats - min) / (max - min)) * 100;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium text-foreground">
          {t("Seats")}
        </label>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {t("{n} seats", { n: seats })}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={seats}
        onChange={(e) => onChange(Number(e.target.value))}
        className="seat-slider h-2.5 w-full cursor-pointer appearance-none rounded-full accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm"
        style={{
          background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${pct}%, hsl(var(--border)) ${pct}%, hsl(var(--border)) 100%)`,
        }}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={seats}
        aria-label={t("Seats")}
      />
      <div className="flex justify-between text-[10px] tabular-nums text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const t = useT();
  const [plans, setPlans] = useState<PublicPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [opsSeats, setOpsSeats] = useState(50);
  const [scaleSeats, setScaleSeats] = useState(150);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    void fetch(`${api}/v1/public/plans`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { plans?: PublicPlan[] };
        if (data.plans?.length) {
          const byCode = new Map(data.plans.map((p) => [p.code, p]));
          const ordered = PLAN_ORDER.map((code) => byCode.get(code)).filter(
            (p): p is PublicPlan => Boolean(p),
          );
          if (ordered.length) {
            setPlans(ordered);
            const ops = byCode.get("ops");
            const scale = byCode.get("scale");
            if (ops?.seatLimit) {
              setOpsSeats(
                Math.min(
                  SEAT_QUOTES.ops.max,
                  Math.max(SEAT_QUOTES.ops.min, ops.seatLimit),
                ),
              );
            }
            if (scale?.seatLimit) {
              setScaleSeats(
                Math.min(
                  SEAT_QUOTES.scale.max,
                  Math.max(SEAT_QUOTES.scale.min, scale.seatLimit),
                ),
              );
            }
          }
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const displayPlans = useMemo(
    () => plans.filter((p) => p.code !== "trial"),
    [plans],
  );

  function seatsFor(code: string): number | undefined {
    if (code === "ops") return opsSeats;
    if (code === "scale") return scaleSeats;
    return undefined;
  }

  function setSeatsFor(code: string, n: number) {
    if (code === "ops") setOpsSeats(n);
    if (code === "scale") setScaleSeats(n);
  }

  return (
    <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("Plans for field crews and people ops")}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {t(
              "Start free for 14 days with both packs. Pick Field, People, or the Ops bundle when you are ready.",
            )}
          </p>
        </div>
      </Reveal>

      {loading ? (
        <div className="mt-12 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      <div className="mt-10 -mx-4 overflow-x-auto px-4 pb-4 pt-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-2 lg:pt-1">
        <div className="flex w-max min-w-full gap-3 lg:grid lg:w-full lg:grid-cols-5 lg:gap-3 lg:overflow-visible xl:gap-4">
          {displayPlans.map((plan, i) => {
            const highlighted = plan.code === "ops";
            const quote =
              plan.code === "ops" || plan.code === "scale"
                ? SEAT_QUOTES[plan.code]
                : null;
            const seats = seatsFor(plan.code);
            const ctaHref =
              plan.code === "enterprise"
                ? "/demo"
                : seats != null
                  ? `/signup?plan=${plan.code}&seats=${seats}`
                  : `/signup?plan=${plan.code}`;
            const ctaLabel =
              plan.code === "enterprise"
                ? t("Request demo")
                : t("Start free trial");
            const lines = featureLines(plan, t, Boolean(quote));
            return (
              <Reveal
                key={plan.code}
                delayMs={i * 40}
                className={cn(
                  "w-[min(17.5rem,78vw)] shrink-0 lg:w-auto lg:min-w-0",
                  highlighted && "relative z-[1] lg:overflow-visible",
                )}
              >
                <article
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border p-4 sm:p-5",
                    highlighted
                      ? [
                          "z-[1] border-primary bg-card",
                          // Soft outer bloom (readable on light backgrounds)
                          "shadow-[0_0_0_1px_hsl(var(--primary)/0.45),0_0_24px_4px_hsl(var(--primary)/0.35),0_0_48px_8px_hsl(var(--primary)/0.22),0_12px_32px_-8px_hsl(var(--primary)/0.3)]",
                          "ring-2 ring-primary/50",
                          "dark:border-primary/70 dark:bg-primary/10",
                          "dark:shadow-[0_0_0_1px_hsl(var(--primary)/0.35),0_0_32px_-4px_hsl(var(--primary)/0.55),0_0_64px_-12px_hsl(var(--primary)/0.35)]",
                          "dark:ring-primary/40",
                          "before:pointer-events-none before:absolute before:-inset-2 before:-z-10 before:rounded-[1.25rem]",
                          "before:bg-primary/30 before:blur-2xl",
                          "dark:before:bg-primary/25 dark:before:blur-2xl",
                          "after:pointer-events-none after:absolute after:inset-0 after:-z-0 after:rounded-2xl",
                          "after:bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_60%)]",
                          "dark:after:bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.28),transparent_65%)]",
                        ].join(" ")
                      : "border-border/90 bg-card shadow-md dark:border-white/10 dark:bg-card/75 dark:shadow-none dark:backdrop-blur",
                  )}
                >
                  {highlighted ? (
                    <p className="relative z-[1] mb-2 inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.7)]">
                      {t("Best value")}
                    </p>
                  ) : null}
                  <h2 className="relative z-[1] text-base font-semibold text-foreground sm:text-lg">
                    {t(plan.name)}
                  </h2>
                  <p className="relative z-[1] mt-1 line-clamp-2 text-xs text-foreground/65 sm:text-sm dark:text-muted-foreground">
                    {plan.description ? t(plan.description) : null}
                  </p>
                  <p className="relative z-[1] mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:mt-4 sm:text-3xl">
                    {formatPrice(plan, t, seats)}
                  </p>
                  {quote && seats != null ? (
                    <div className="relative z-[1]">
                      <SeatSlider
                        seats={seats}
                        min={quote.min}
                        max={quote.max}
                        step={quote.step}
                        onChange={(n) => setSeatsFor(plan.code, n)}
                        t={t}
                      />
                      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                        {quoteHint(
                          plan.code as "ops" | "scale",
                          seats,
                          t,
                        )}
                      </p>
                    </div>
                  ) : null}
                  <ul className="relative z-[1] mt-3 flex-1 space-y-1.5 text-xs text-foreground/70 sm:mt-4 sm:space-y-2 sm:text-sm dark:text-muted-foreground">
                    {lines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={cn(
                      "relative z-[1] mt-5 w-full sm:mt-6",
                      highlighted
                        ? "shadow-[0_0_22px_hsl(var(--primary)/0.45)] dark:shadow-[0_0_24px_hsl(var(--primary)/0.45)]"
                        : "border-border bg-card text-foreground shadow-sm hover:bg-muted/70",
                    )}
                    variant={highlighted ? "default" : "outline"}
                  >
                    <Link href={ctaHref}>{ctaLabel}</Link>
                  </Button>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </div>
  );
}
