"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import {
  derivePackFlags,
  isSeatQuoteCode,
  quoteForSeats,
  SEAT_QUOTES,
  type ModuleKey,
  type SeatQuoteCode,
} from "@hr/shared";

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
    description: "Field ops only",
    amountCents: 600,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    features: { fieldOps: true, peopleOps: false, analytics: false, integrations: false },
  },
  {
    code: "people",
    name: "People",
    description: "People ops only",
    amountCents: 600,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    features: { fieldOps: false, peopleOps: true, analytics: false, integrations: false },
  },
  {
    code: "ops",
    name: "Ops",
    description: "Field + People + Analytics",
    amountCents: 900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 50,
    features: { fieldOps: true, peopleOps: true, analytics: true, integrations: false },
  },
  {
    code: "scale",
    name: "Scale",
    description: "Everything + Integrations",
    amountCents: 1400,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 150,
    features: { fieldOps: true, peopleOps: true, analytics: true, integrations: true },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Custom limits, dedicated success, single sign-on when it ships.",
    amountCents: 0,
    currency: "USD",
    intervalDays: 30,
    seatLimit: null,
    features: { fieldOps: true, peopleOps: true, analytics: true, integrations: true },
  },
];

const PLAN_ORDER = ["field", "people", "ops", "scale", "enterprise"] as const;

const FEATURE_BULLETS: Record<string, string[]> = {
  field: [
    "Clock with geofences",
    "Live map",
    "Team today",
    "Attendance and hours",
  ],
  people: [
    "Leave and balances",
    "Hiring pipeline",
    "KPIs and tasks",
    "Compensation",
  ],
  ops: [
    "Everything in Field and People",
    "Analytics and trends",
    "Branch reports",
    "Custom alert rules",
  ],
  scale: [
    "Everything in Ops",
    "CMS Goals and HubSpot",
    "Custom REST and webhooks",
    "Priority support",
  ],
};

function formatMoney(amountCents: number, currency: string) {
  return (amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
}

function featureLines(plan: PublicPlan, t: (s: string) => string): string[] {
  const preset = FEATURE_BULLETS[plan.code];
  if (preset) return preset.map((l) => t(l));
  const packs = derivePackFlags(
    (plan.features ?? {}) as Partial<Record<ModuleKey, boolean>>,
  );
  const lines: string[] = [];
  if (packs.fieldOps || plan.features?.fieldOps === true) {
    lines.push(t("Field ops: clock, live map, GPS presence"));
  }
  if (packs.peopleOps || plan.features?.peopleOps === true) {
    lines.push(t("People ops: leave, KPIs, hiring, compensation"));
  }
  if (packs.analytics || plan.features?.analytics === true) {
    lines.push(t("Analytics dashboards"));
  }
  if (packs.integrations || plan.features?.integrations === true) {
    lines.push(t("Integrations hub"));
  }
  return lines;
}

export default function PricingPage() {
  const t = useT();
  const [plans, setPlans] = useState<PublicPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(60);

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
          if (ordered.length) setPlans(ordered);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const displayPlans = useMemo(
    () => plans.filter((p) => p.code !== "trial" && p.code !== "enterprise"),
    [plans],
  );
  const enterprise = plans.find((p) => p.code === "enterprise");
  const seatPct = ((seats - 5) / 495) * 100;

  function priceLabel(plan: PublicPlan) {
    if (plan.amountCents === 0) return t("Custom");
    if (isSeatQuoteCode(plan.code)) {
      return formatMoney(quoteForSeats(plan.code as SeatQuoteCode, seats), plan.currency);
    }
    // Fallback: treat amountCents as monthly base scaled loosely by seats when no quote table
    const perSeat = plan.amountCents;
    if (perSeat < 5000) {
      return formatMoney(perSeat * seats, plan.currency);
    }
    return formatMoney(plan.amountCents, plan.currency);
  }

  function perSeatHint(plan: PublicPlan) {
    if (isSeatQuoteCode(plan.code)) {
      const q = SEAT_QUOTES[plan.code];
      if (seats <= q.included) {
        return t("Plan price · up to {n} seats included", { n: q.included });
      }
      return `$${(q.overageCents / 100).toFixed(0)} ${t("per seat")}`;
    }
    if (plan.amountCents > 0 && plan.amountCents < 5000) {
      return `${formatMoney(plan.amountCents, plan.currency)} ${t("per seat")}`;
    }
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {t("Pricing")}
        </p>
        <h1 className="mt-2 text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.03em] text-ink">
          {t("Pay per seat. Change any time.")}
        </h1>
        <p className="mt-2 text-sm text-ink-2">
          {t("Every plan starts with a 14-day trial.")}
        </p>
      </div>

      <div className="mx-auto mt-7 max-w-xl rounded-lg border border-line bg-surface p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">{t("Team size")}</p>
          <p className="text-sm font-medium tabular text-ink-2">
            {seats} {t("seats")}
          </p>
        </div>
        <input
          type="range"
          min={5}
          max={500}
          step={1}
          value={seats}
          onChange={(e) => setSeats(Number(e.target.value))}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full accent-accent"
          style={{
            background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${seatPct}%, hsl(var(--line-strong)) ${seatPct}%, hsl(var(--line-strong)) 100%)`,
          }}
          aria-label={t("Team size")}
        />
        <div className="mt-1 flex justify-between text-2xs tabular text-ink-muted">
          <span>5</span>
          <span>500</span>
        </div>
      </div>

      {loading ? (
        <div className="mt-10 flex justify-center text-ink-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      <div className="mt-7 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {displayPlans.map((plan) => {
          const featured = plan.code === "ops";
          const ctaHref = `/signup?plan=${plan.code}&seats=${seats}`;
          const lines = featureLines(plan, t);
          const hint = perSeatHint(plan);
          return (
            <article
              key={plan.code}
              className={cn(
                "flex flex-col gap-3.5 rounded-xl border p-6",
                featured
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-line bg-surface text-ink",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[17px] font-semibold">{t(plan.name)}</p>
                {featured ? (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-semibold text-accent-ink">
                    {t("Most popular")}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-sm",
                  featured ? "text-primary-foreground/60" : "text-ink-muted",
                )}
              >
                {plan.description ? t(plan.description) : null}
              </p>
              <div>
                <p className="text-stat-lg font-semibold tracking-tight tabular">
                  <span dir="ltr">{priceLabel(plan)}</span>
                </p>
                <p
                  className={cn(
                    "text-sm",
                    featured ? "text-primary-foreground/60" : "text-ink-muted",
                  )}
                >
                  {t("/month")}
                </p>
                {hint ? (
                  <p
                    className={cn(
                      "mt-1 text-2xs",
                      featured ? "text-primary-foreground/50" : "text-ink-muted",
                    )}
                  >
                    {hint}
                  </p>
                ) : null}
              </div>
              <Button
                asChild
                className={cn(
                  "w-full",
                  featured
                    ? "bg-accent text-accent-ink hover:bg-accent-strong"
                    : undefined,
                )}
                variant={featured ? "accent" : "default"}
              >
                <Link href={ctaHref}>{t("Start trial")}</Link>
              </Button>
              <ul className="mt-1 space-y-2.5 text-[13px]">
                {lines.map((line) => (
                  <li key={line} className="flex gap-2.5">
                    <Check
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        featured ? "text-accent" : "text-accent-strong",
                      )}
                      strokeWidth={2.5}
                    />
                    <span
                      className={
                        featured ? "text-primary-foreground/90" : "text-ink-2"
                      }
                    >
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {enterprise ? (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-surface px-[22px] py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">{t("Enterprise")}</p>
            <p className="text-sm text-ink-muted">
              {enterprise.description
                ? t(enterprise.description)
                : t(
                    "Custom limits, dedicated success, single sign-on when it ships.",
                  )}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
            <Link href="/demo">{t("Talk to sales")}</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
