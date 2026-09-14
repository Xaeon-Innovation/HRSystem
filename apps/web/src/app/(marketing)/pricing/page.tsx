"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { useT } from "@/i18n/provider";

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
    code: "trial",
    name: "Trial",
    description: "14-day free trial for new tenants",
    amountCents: 0,
    currency: "USD",
    intervalDays: 15,
    seatLimit: 10,
    features: { trialDays: 14 },
  },
  {
    code: "starter",
    name: "Starter",
    description: "Small teams getting started",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    features: {},
  },
  {
    code: "pro",
    name: "Pro",
    description: "Growing field operations",
    amountCents: 14900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 100,
    features: { integrations: true, analytics: true },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited seats and priority support",
    amountCents: 49900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: null,
    features: { integrations: true, analytics: true },
  },
];

function formatPrice(plan: PublicPlan, t: (s: string) => string) {
  if (plan.amountCents === 0) return t("Free");
  const amount = (plan.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: plan.currency || "USD",
    maximumFractionDigits: 0,
  });
  return `${amount}${t("/mo")}`;
}

function seatLabel(plan: PublicPlan, t: (s: string, v?: Record<string, string | number>) => string) {
  if (plan.seatLimit == null) return t("Unlimited seats");
  return t("Up to {n} seats", { n: plan.seatLimit });
}

export default function PricingPage() {
  const t = useT();
  const [plans, setPlans] = useState<PublicPlan[]>(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    void fetch(`${api}/v1/public/plans`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { plans?: PublicPlan[] };
        if (data.plans?.length) setPlans(data.plans);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("Simple pricing for growing teams")}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {t(
              "Start free for 14 days. Upgrade when you are ready, billing lives inside your workspace.",
            )}
          </p>
        </div>
      </Reveal>

      {loading ? (
        <div className="mt-12 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, i) => {
          const highlighted = plan.code === "pro";
          const ctaHref =
            plan.code === "enterprise" ? "/demo" : "/signup";
          const ctaLabel =
            plan.code === "enterprise"
              ? t("Request demo")
              : plan.code === "trial"
                ? t("Start free trial")
                : t("Start your plan");
          return (
            <Reveal key={plan.code} delayMs={i * 50}>
              <article
                className={`flex h-full flex-col rounded-2xl border p-5 backdrop-blur ${
                  highlighted
                    ? "border-primary/40 bg-primary/5 shadow-md"
                    : "border-border/70 bg-card/75 dark:border-white/10"
                }`}
              >
                <h2 className="text-lg font-semibold">{t(plan.name)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description ? t(plan.description) : null}
                </p>
                <p className="mt-4 text-3xl font-semibold tracking-tight">
                  {formatPrice(plan, t)}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {seatLabel(plan, t)}
                  </li>
                  {plan.features?.integrations ? (
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t("Integrations")}
                    </li>
                  ) : null}
                  {plan.features?.analytics ? (
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t("Analytics")}
                    </li>
                  ) : null}
                  {plan.code === "trial" ? (
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {t("Full product access")}
                    </li>
                  ) : null}
                </ul>
                <Button
                  asChild
                  className="mt-6 w-full"
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
  );
}
