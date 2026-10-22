"use client";

import {
  Briefcase,
  Check,
  Fingerprint,
  MapPin,
  MapPinned,
  Palmtree,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

type T = ReturnType<typeof useT>;

const CARD = "rounded-lg border border-line bg-surface p-3.5 shadow-pop";

function CardHead({
  icon: Icon,
  title,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-tint text-accent-strong">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <p className="text-xs font-semibold text-ink">{title}</p>
      </div>
      {aside}
    </div>
  );
}

function LiveDot({ t }: { t: T }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-accent-strong">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-strong" />
      {t("Live")}
    </span>
  );
}

function ClockCard({ t }: { t: T }) {
  return (
    <div className={CARD}>
      <CardHead icon={Fingerprint} title={t("Clock-in")} />
      <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-ink tabular">
        08:02
      </p>
      <p className="mt-1 text-[11px] text-ink-muted">{t("Clocked in")}</p>
      <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2 py-1 text-[10.5px] font-medium text-accent-strong">
        <Check className="h-3 w-3" strokeWidth={2.5} />
        {t("Inside Maadi branch")}
      </p>
    </div>
  );
}

const PINS = [
  { top: "22%", left: "18%" },
  { top: "58%", left: "36%" },
  { top: "30%", left: "64%" },
  { top: "66%", left: "80%" },
];

function MapCard({ t }: { t: T }) {
  return (
    <div className={CARD}>
      <CardHead icon={MapPinned} title={t("Live map")} aside={<LiveDot t={t} />} />
      <div
        className="relative mt-3 h-20 overflow-hidden rounded-md bg-surface-2"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--line-strong)) 1px, transparent 1px)",
          backgroundSize: "8px 8px",
        }}
      >
        {PINS.map((p, i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 -translate-y-full text-accent-strong"
            style={p}
          >
            <MapPin className="h-4 w-4 fill-accent-tint" strokeWidth={2} />
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-muted">{t("31 on the map")}</p>
    </div>
  );
}

function ShiftsCard({ t }: { t: T }) {
  const rows = [
    { label: t("Morning"), time: "08:00–16:00", n: 8, bar: "bg-accent" },
    { label: t("Evening"), time: "16:00–00:00", n: 6, bar: "bg-info" },
  ];
  return (
    <div className={CARD}>
      <CardHead icon={Briefcase} title={t("Shifts")} />
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.time} className="flex items-center gap-2.5">
            <span className={cn("h-8 w-1 rounded-full", r.bar)} />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold text-ink">{r.label}</p>
              <p className="text-[10.5px] text-ink-muted tabular">{r.time}</p>
            </div>
            <span className="text-[11px] font-medium text-ink-2 tabular">
              {t("{n} staff", { n: r.n })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ t }: { t: T }) {
  const pct = 92;
  const c = 2 * Math.PI * 22;
  return (
    <div className={CARD}>
      <CardHead icon={Target} title={t("KPIs")} />
      <div className="mt-3 flex items-center gap-3">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r="22" fill="none" strokeWidth="6" className="stroke-surface-3" />
          <circle
            cx="28"
            cy="28"
            r="22"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct / 100)}
            className="stroke-accent"
          />
        </svg>
        <div>
          <p className="text-xl font-semibold leading-none text-ink tabular">{pct}%</p>
          <p className="mt-1 text-[10.5px] text-ink-muted">{t("Q3 weighted score")}</p>
          <p className="mt-0.5 text-[10.5px] font-medium text-accent-strong">
            {t("+{n} pts", { n: 6 })}
          </p>
        </div>
      </div>
    </div>
  );
}

function TasksCard({ t }: { t: T }) {
  const tasks = [
    { n: 8, label: t("Visit Nasr City clients"), pct: 60, bar: "bg-info" },
    { n: 3, label: t("Restock branch 4"), pct: 100, bar: "bg-accent" },
  ];
  return (
    <div className={CARD}>
      <p className="text-xs font-semibold text-ink">{t("Today's tasks")}</p>
      <div className="mt-2.5 space-y-2">
        {tasks.map((task) => (
          <div key={task.n} className="rounded-md border border-line bg-surface-2/60 p-2">
            <div className="flex items-center gap-2">
              <span className="grid h-4 w-4 place-items-center rounded-[4px] bg-warn/20 text-[9.5px] font-bold text-warn">
                {task.n}
              </span>
              <p className="truncate text-[11px] font-medium text-ink">{task.label}</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className={cn("h-full rounded-full", task.bar)} style={{ width: `${task.pct}%` }} />
              </div>
              <span className="text-[10px] text-ink-muted tabular">{task.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeavePayCard({ t }: { t: T }) {
  return (
    <div className="space-y-2">
      <div className={CARD}>
        <CardHead
          icon={Palmtree}
          title={t("Leave request")}
          aside={
            <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-semibold text-warn">
              {t("Pending")}
            </span>
          }
        />
        <div className="mt-2.5 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-surface-2 text-[10px] font-semibold text-ink">
            YN
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11.5px] font-semibold text-ink">Youssef Nabil</p>
            <p className="truncate text-[10.5px] text-ink-muted">
              {t("Annual")} · 2 {t("days")}
            </p>
          </div>
          <span className="rounded-sm bg-ink px-2.5 py-1 text-[10.5px] font-medium text-primary-foreground">
            {t("Approve")}
          </span>
        </div>
      </div>
      <div className={cn(CARD, "flex items-center gap-2 py-2.5")}>
        <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent-tint text-accent-strong">
          <Wallet className="h-3.5 w-3.5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="text-[11.5px] font-semibold text-ink">{t("Payroll approved")}</p>
          <p className="text-[10.5px] text-ink-muted">{t("{n} staff", { n: 52 })}</p>
        </div>
      </div>
    </div>
  );
}

/** Gentle entrance + idle float. Static when the user prefers reduced motion. */
function Float({
  children,
  className,
  delay = 0,
  rotate = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  rotate?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} style={{ rotate: `${rotate}deg` }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{
          duration: 5 + delay * 2,
          delay: 0.7 + delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Decorative module cards that float around the hero copy (lg and up). */
export function HeroOrbit() {
  const t = useT();

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
      <Float className="absolute start-6 top-8 w-[184px] xl:start-10 xl:w-[200px]" rotate={-5} delay={0.1}>
        <ClockCard t={t} />
      </Float>
      <Float className="absolute end-6 top-10 w-[200px] xl:end-10 xl:w-[216px]" rotate={4} delay={0.2}>
        <MapCard t={t} />
      </Float>
      <Float className="absolute -start-8 top-[40%] hidden w-[200px] xl:block" rotate={3} delay={0.35}>
        <ShiftsCard t={t} />
      </Float>
      <Float className="absolute -end-8 top-[42%] hidden w-[200px] xl:block" rotate={-3} delay={0.45}>
        <KpiCard t={t} />
      </Float>
      <Float className="absolute bottom-8 start-6 w-[200px] xl:start-12 xl:w-[220px]" rotate={3} delay={0.3}>
        <TasksCard t={t} />
      </Float>
      <Float className="absolute bottom-6 end-6 w-[210px] xl:end-12 xl:w-[230px]" rotate={-4} delay={0.4}>
        <LeavePayCard t={t} />
      </Float>
    </div>
  );
}

/** Same cards as a swipeable row for screens without room to float them. */
export function HeroOrbitRow() {
  const t = useT();
  const cards = [ClockCard, TasksCard, MapCard, LeavePayCard];

  return (
    <div
      aria-hidden
      className="-mx-5 mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 [scrollbar-width:none] lg:hidden"
    >
      {cards.map((Card, i) => (
        <div key={i} className="w-[220px] shrink-0 snap-center text-start">
          <Card t={t} />
        </div>
      ))}
    </div>
  );
}

const RING: LucideIcon[] = [Fingerprint, MapPinned, Target, Palmtree, Briefcase, Wallet];

/** Center mark: the Elevora "E" with every module orbiting it. */
export function HeroMark() {
  const reduce = useReducedMotion();
  const radius = 54;

  return (
    <div aria-hidden className="relative mx-auto h-[140px] w-[140px]">
      <div className="absolute inset-[14px] rounded-full border border-dashed border-line-strong" />
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {RING.map((Icon, i) => {
          const a = (i / RING.length) * 2 * Math.PI - Math.PI / 2;
          return (
            <motion.span
              key={i}
              className="absolute grid h-7 w-7 place-items-center rounded-[9px] border border-line bg-surface text-ink shadow-pop"
              style={{
                left: 70 + radius * Math.cos(a) - 14,
                top: 70 + radius * Math.sin(a) - 14,
              }}
              animate={reduce ? undefined : { rotate: -360 }}
              transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
            </motion.span>
          );
        })}
      </motion.div>
      <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl border border-line bg-surface shadow-pop">
        <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-ink text-primary-foreground">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 19V5h12M5 12h9M5 19h14"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </div>
  );
}
