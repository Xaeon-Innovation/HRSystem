"use client";

import { useT } from "@/i18n/provider";

export default function PrivacyPage() {
  const t = useT();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("Privacy Policy")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Last updated:")} 13 September 2026
      </p>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <p>
          {t(
            "This Privacy Policy explains how Elevora (a Xaeon product) processes information when you visit our marketing site or use the Elevora platform.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("Information we process")}
        </h2>
        <ul className="list-disc space-y-2 ps-5">
          <li>
            {t(
              "Account data: organization name, admin name, email, and authentication credentials.",
            )}
          </li>
          <li>
            {t(
              "Workforce data your organization enters: employee profiles, attendance, leave, KPIs, hiring, and compensation records.",
            )}
          </li>
          <li>
            {t(
              "Location data when enabled: clock-in/out coordinates and periodic location pings while an employee is clocked in, used for attendance and live field presence.",
            )}
          </li>
          <li>
            {t(
              "Demo and support messages you send to us (for example via the Request demo form).",
            )}
          </li>
        </ul>
        <h2 className="text-lg font-semibold text-foreground">
          {t("How we use information")}
        </h2>
        <p>
          {t(
            "We use data to provide and secure the service, operate multi-tenant isolation, bill subscriptions, send transactional email, improve reliability, and respond to demos or support requests.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("Retention")}
        </h2>
        <p>
          {t(
            "Raw location pings are retained per tenant setting (default 60 days, typically 30–90). Attendance snapshots and business records are kept as needed for the organization’s use of Elevora. Audit logs of sensitive admin actions are retained for accountability.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("Sharing")}
        </h2>
        <p>
          {t(
            "We do not sell personal data. We may use subprocessors (hosting, email, payments) under contract. Tenant data is not shared with other customers.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("Your responsibilities")}
        </h2>
        <p>
          {t(
            "Employers using Elevora should disclose continuous or GPS-based tracking in employment policies, obtain required consent, and configure retention appropriately for their jurisdiction.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("Contact")}
        </h2>
        <p>
          {t("Privacy questions:")}{" "}
          <a
            className="text-foreground underline"
            href="mailto:info@xaeons.com"
          >
            info@xaeons.com
          </a>
        </p>
        <p className="text-xs">
          {t(
            "This document is a general SaaS draft and is not legal advice.",
          )}
        </p>
      </div>
    </article>
  );
}
