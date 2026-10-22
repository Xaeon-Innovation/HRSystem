"use client";

import { HatchBar } from "@/components/elevora";
import { useT } from "@/i18n/provider";

const STEPS = [
  {
    n: "01",
    title: "Set up your workspace",
    sub: "Branches, job roles, shift patterns and work zones. Your brand and colors.",
    pct: 86,
  },
  {
    n: "02",
    title: "Import your people",
    sub: "Paste or upload a CSV. Review incomplete rows before you commit.",
    pct: 64,
  },
  {
    n: "03",
    title: "Run the day",
    sub: "Clock-ins, the live map, leave approvals and alerts in one place.",
    pct: 94,
  },
] as const;

export function HowItWorks() {
  const t = useT();

  return (
    <section id="how-it-works" className="scroll-mt-24 py-12 sm:py-16">
      <div className="max-w-2xl">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {t("How it works")}
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.03em] text-ink">
          {t("Live in an afternoon.")}
        </h2>
        <p className="mt-2 text-sm text-ink-2 sm:text-[15px]">
          {t(
            "Set up your org, import your roster, and your team clocks in tomorrow morning.",
          )}
        </p>
      </div>

      <div className="mt-8 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => (
          <div
            key={step.n}
            className="rounded-lg border border-line bg-surface p-[22px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
                {step.n}
              </span>
              <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-2xs font-semibold tabular text-ink">
                {step.pct}%
              </span>
            </div>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink">
              {t(step.title)}
            </h3>
            <p className="mt-1.5 text-sm text-ink-muted">{t(step.sub)}</p>
            <div className="mt-4">
              <HatchBar percent={step.pct} size="sm" tone="accent" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
