"use client";

import { useT } from "@/i18n/provider";

const SECTIONS = [
  {
    id: "account",
    title: "Your account",
    body: "You are responsible for your workspace, the people you invite and the roles you grant.",
  },
  {
    id: "subscriptions",
    title: "Subscriptions",
    body: "Plans are billed per seat. Cancel any time; access continues to period end.",
  },
  {
    id: "use",
    title: "Acceptable use",
    body: "Do not use Elevora to track people outside working hours or without notice.",
  },
  {
    id: "liability",
    title: "Liability",
    body: "The service is provided as is, within the limits of applicable law.",
  },
] as const;

export default function TermsPage() {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
        {t("Legal")}
      </p>
      <h1 className="mt-2.5 text-[clamp(32px,4vw,40px)] font-semibold tracking-[-0.035em] text-ink">
        {t("Terms of use")}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {t("Last updated")} 01 October 2026
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[200px_minmax(0,720px)]">
        <nav className="hidden space-y-2 text-sm lg:sticky lg:top-24 lg:block lg:self-start">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block text-ink-muted hover:text-ink"
            >
              {t(s.title)}
            </a>
          ))}
        </nav>
        <div className="max-w-[720px] space-y-8 text-[15px] leading-relaxed text-ink-2">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-lg font-semibold text-ink">{t(s.title)}</h2>
              <p className="mt-2">{t(s.body)}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
