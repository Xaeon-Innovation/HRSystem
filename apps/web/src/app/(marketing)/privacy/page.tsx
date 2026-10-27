"use client";

import { useT } from "@/i18n/provider";

const SECTIONS = [
  {
    id: "collect",
    title: "What we collect",
    body: "Account details, roster data your organization adds, clock events, task and leave attachments, device identifiers for signed-in sessions, and location points while an employee is on shift in Polara Field.",
  },
  {
    id: "location",
    title: "How location works",
    body: "When In Use: Polara checks GPS at clock-in against the employee’s work zone. Always / all-the-time (Polara Field): for mobile-presence field staff only, location may update while the app is in the background during an active shift. Tracking stops on clock-out or sign-out. Fixed-zone employees are checked against their geofence at clock-in.",
  },
  {
    id: "background",
    title: "Background location (Polara Field)",
    body: "If the employee grants background location, Polara Field may collect precise location even when the app is not open — only while clocked in. Android shows a persistent notification (“On shift · tracking location”). Continued use of GPS in the background can dramatically decrease battery life. Employees see an in-app disclosure before the system permission prompt.",
  },
  {
    id: "access",
    title: "Who can see data",
    body: "Your tenant admins and the module roles they grant. Xaeon staff access data only for support with your permission.",
  },
  {
    id: "accounts",
    title: "Accounts and deletion",
    body: "Polara Field does not offer self-service account creation; employers invite employees. To delete an account or personal data, contact your organization’s HR or admin, or email privacy@xaeons.com. Tenant deletion follows the retention process below.",
  },
  {
    id: "retention",
    title: "Retention",
    body: "You control retention per tenant. Deleted tenants are soft-deleted, then purged after 30 days.",
  },
  {
    id: "contact",
    title: "Contact",
    body: "privacy@xaeons.com",
  },
] as const;

export default function PrivacyPage() {
  const t = useT();

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-10 sm:px-8 sm:py-14">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
        {t("Legal")}
      </p>
      <h1 className="mt-2.5 text-[clamp(32px,4vw,40px)] font-semibold tracking-[-0.035em] text-ink">
        {t("Privacy policy")}
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        {t("Last updated")} 16 October 2026
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
