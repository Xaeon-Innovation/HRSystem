"use client";

import {
  ArrowRight,
  Building2,
  CalendarDays,
  Palmtree,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { HatchBar, type HatchTone } from "@/components/elevora";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type T = ReturnType<typeof useT>;

const PANEL = "mt-4 rounded-md border border-line bg-frame/60 p-3.5";

function EmployeePreview({ t }: { t: T }) {
  return (
    <div className={PANEL}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
            {t("My scorecard")}
          </p>
          <p className="mt-1.5 text-[26px] font-semibold leading-none tracking-tight text-ink tabular">
            86%
          </p>
        </div>
        <span className="rounded-full bg-accent-tint px-2 py-1 text-[10.5px] font-medium text-accent-strong">
          {t("On track")}
        </span>
      </div>
      <HatchBar percent={86} size="sm" className="mt-3" />
      <div className="mt-3 space-y-1.5 text-[11.5px]">
        <p className="flex items-center justify-between gap-2 text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Palmtree className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t("Leave balance")}
          </span>
          <span className="font-medium text-ink tabular">{t("{n} days", { n: 12 })}</span>
        </p>
        <p className="flex items-center justify-between gap-2 text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t("Next shift")}
          </span>
          <span className="font-medium text-ink tabular">{t("Tomorrow, 08:00")}</span>
        </p>
      </div>
    </div>
  );
}

const TEAM: { initials: string; name: string; status: string; tone: string; score: number }[] = [
  { initials: "OK", name: "Omar K.", status: "On shift", tone: "bg-accent-tint text-accent-strong", score: 91 },
  { initials: "SA", name: "Salma A.", status: "On leave", tone: "bg-info/15 text-info", score: 84 },
  { initials: "YM", name: "Youssef M.", status: "Late", tone: "bg-warn/15 text-warn", score: 67 },
];

function ManagerPreview({ t }: { t: T }) {
  return (
    <div className={PANEL}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
        {t("Team today")}
      </p>
      <div className="mt-2.5 space-y-2">
        {TEAM.map((p) => (
          <div key={p.name} className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink">
              {p.initials}
            </span>
            <p className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink">
              {p.name}
            </p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", p.tone)}>
              {t(p.status)}
            </span>
            <span className="w-8 text-end text-[11px] font-medium text-ink-2 tabular">
              {p.score}%
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-muted">
        <span>{t("Team KPI")}</span>
        <span className="font-medium text-ink tabular">81%</span>
      </div>
      <HatchBar percent={81} size="xs" className="mt-1.5" />
    </div>
  );
}

const GOALS: { label: string; pct: number; tone: HatchTone }[] = [
  { label: "On-time deliveries", pct: 88, tone: "accent" },
  { label: "Customer response time", pct: 72, tone: "accent" },
  { label: "First-year retention", pct: 58, tone: "warn" },
];

function HrPreview({ t }: { t: T }) {
  return (
    <div className={PANEL}>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
        {t("Company goals")}
      </p>
      <div className="mt-2.5 space-y-2.5">
        {GOALS.map((g) => (
          <div key={g.label}>
            <div className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="truncate font-medium text-ink">{t(g.label)}</span>
              <span className="text-ink-2 tabular">{g.pct}%</span>
            </div>
            <HatchBar percent={g.pct} tone={g.tone} size="xs" className="mt-1" />
          </div>
        ))}
      </div>
      <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2 py-1 text-[10.5px] font-medium text-accent-strong">
        <span className="h-1.5 w-1.5 rounded-full bg-accent-strong" />
        {t("3 branches aligned")}
      </p>
    </div>
  );
}

const VIEWS: {
  icon: LucideIcon;
  role: string;
  view: string;
  headline: string;
  Preview: (props: { t: T }) => React.ReactNode;
}[] = [
  {
    icon: UserRound,
    role: "Employees",
    view: "My view",
    headline: "Employees understand where they stand.",
    Preview: EmployeePreview,
  },
  {
    icon: UsersRound,
    role: "Managers",
    view: "Team view",
    headline: "Managers get a clearer view of their teams.",
    Preview: ManagerPreview,
  },
  {
    icon: Building2,
    role: "HR",
    view: "Company view",
    headline: "HR brings people, processes, and company goals into alignment.",
    Preview: HrPreview,
  },
];

const FLOW = ["Employee clocks in", "Manager sees it live", "HR reports on it"];

function StarTile({ size = "md" }: { size?: "sm" | "md" }) {
  const px = size === "md" ? 18 : 14;
  return (
    <span
      className={cn(
        "grid place-items-center bg-ink text-primary-foreground",
        size === "md" ? "h-9 w-9 rounded-[10px]" : "h-7 w-7 rounded-[8px]",
      )}
    >
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 2.5 13.9 10.1 21.5 12 13.9 13.9 12 21.5 10.1 13.9 2.5 12 10.1 10.1Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Desktop connector: one stem from the hub, branching down to each of the three cards. */
function Branches() {
  const drop = "absolute top-1/2 h-1/2 border-s border-dashed border-line-strong";
  const node = "absolute bottom-0 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent-strong rtl:translate-x-1/2";
  return (
    <div aria-hidden className="relative hidden h-12 lg:block">
      <span className="absolute start-1/2 top-0 h-1/2 border-s border-dashed border-line-strong" />
      <span className="absolute start-[16.666%] end-[16.666%] top-1/2 border-t border-dashed border-line-strong" />
      {["16.666%", "50%", "83.333%"].map((at) => (
        <span key={at}>
          <span className={drop} style={{ insetInlineStart: at }} />
          <span className={node} style={{ insetInlineStart: at }} />
        </span>
      ))}
    </div>
  );
}

export function ConnectedViews() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <section id="connected" className="scroll-mt-24 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl text-center" dir={isAr ? "rtl" : undefined}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {t("One connected system")}
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.03em] text-ink">
          {t("Same data. Every level. One direction.")}
        </h2>
        <p className="mt-2 text-sm text-ink-2 sm:text-[15px]">
          {t(
            "Polara links each person's work to their team and to company goals, so everyone moves the same way.",
          )}
        </p>
      </div>

      <div dir={isAr ? "rtl" : undefined}>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pe-4 ps-2.5 shadow-pop">
            <StarTile />
            <div className="text-start">
              <p className="text-[13.5px] font-semibold text-ink">Polara</p>
              <p className="text-[11.5px] text-ink-muted">{t("One source of truth")}</p>
            </div>
          </div>
        </div>

        <Branches />

        {/* Mobile: a dashed spine runs behind the stacked cards and shows in the gaps. */}
        <div className="relative mt-5 grid gap-5 lg:mt-0 lg:grid-cols-3 lg:gap-3.5">
          <span
            aria-hidden
            className="absolute -top-5 bottom-0 start-1/2 border-s border-dashed border-line-strong lg:hidden"
          />
          {VIEWS.map(({ icon: Icon, role, view, headline, Preview }) => (
            <article
              key={role}
              className="relative flex flex-col rounded-lg border border-line bg-surface p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-11 w-11 place-items-center rounded-[9px] bg-surface-2 text-ink">
                    <Icon className="h-5 w-5" strokeWidth={1.7} />
                  </span>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
                    {t(role)}
                  </p>
                </div>
                <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-2xs font-semibold text-ink">
                  {t(view)}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight text-ink">
                {t(headline)}
              </h3>
              <div className="mt-auto">
                <Preview t={t} />
              </div>
            </article>
          ))}
        </div>

        <div className="relative mt-5 flex flex-col items-center gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:justify-center sm:gap-2">
          <span className="inline-flex items-center gap-2 text-[12.5px] font-medium text-ink-muted sm:me-2">
            <StarTile size="sm" />
            {t("One clock-in, three views:")}
          </span>
          {FLOW.map((step, i) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-medium text-ink">
                {t(step)}
              </span>
              {i < FLOW.length - 1 ? (
                <ArrowRight
                  className={cn(
                    "hidden h-3.5 w-3.5 text-ink-muted sm:block",
                    isAr && "-scale-x-100",
                  )}
                />
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
