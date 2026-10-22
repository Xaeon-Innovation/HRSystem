"use client";

import {
  HardHat,
  ShoppingBag,
  Stethoscope,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useT } from "@/i18n/provider";

const AUDIENCES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Truck,
    title: "Logistics and delivery",
    body: "Drivers clock in anywhere. Managers see them live.",
  },
  {
    icon: Stethoscope,
    title: "Clinics and healthcare",
    body: "Shifts, leave cover and staff credentials.",
  },
  {
    icon: HardHat,
    title: "Facilities and maintenance",
    body: "Technicians, visits, jobs and KPIs.",
  },
  {
    icon: ShoppingBag,
    title: "Retail and hospitality",
    body: "Multi-branch rosters with fixed zones.",
  },
];

export function WhoItsFor() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <section id="who" className="scroll-mt-24 py-12 sm:py-14">
      <div className="max-w-2xl" dir={isAr ? "rtl" : undefined}>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {t("Who it is for")}
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.03em] text-ink">
          {t("Teams that work in the field and the office.")}
        </h2>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCES.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="rounded-lg border border-line bg-surface p-5"
            dir={isAr ? "rtl" : undefined}
          >
            <span className="grid h-11 w-11 place-items-center rounded-[9px] bg-surface-2 text-ink">
              <Icon className="h-5 w-5" strokeWidth={1.7} />
            </span>
            <h3 className="mt-3 text-[15px] font-semibold text-ink">
              {t(title)}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{t(body)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
