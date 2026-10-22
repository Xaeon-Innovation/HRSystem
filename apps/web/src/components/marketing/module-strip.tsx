"use client";

import {
  Briefcase,
  Fingerprint,
  MapPinned,
  Palmtree,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n/provider";

const MODULES: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: Fingerprint, label: "Clock-in", sub: "Geofenced, one tap" },
  { icon: MapPinned, label: "Live map", sub: "Realtime positions" },
  { icon: Target, label: "KPIs", sub: "Weighted scorecards" },
  { icon: Palmtree, label: "Leave", sub: "Balances and ledger" },
  { icon: Briefcase, label: "Hiring", sub: "Pipeline to roster" },
  { icon: Wallet, label: "Compensation", sub: "Approvals and payroll" },
];

export function ModuleStrip() {
  const t = useT();

  return (
    <section id="features" className="scroll-mt-24 py-5 sm:py-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {MODULES.map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-surface p-4"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-surface-2 text-ink">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <p className="mt-[18px] text-[13.5px] font-semibold text-ink">
              {t(label)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-muted">{t(sub)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
