"use client";

import { useT } from "@/i18n/provider";

export default function TermsPage() {
  const t = useT();
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("Terms of Service")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Last updated:")} 13 September 2026
      </p>
      <div className="prose prose-neutral mt-8 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground dark:prose-invert">
        <p>
          {t(
            "These Terms govern access to Elevora, a multi-tenant HR and field workforce platform operated by Xaeon (“we”, “us”). By creating an account or using the service, you agree to these Terms.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("1. The service")}
        </h2>
        <p>
          {t(
            "Elevora provides workforce tools including attendance clock-in/out, optional GPS location for field presence, KPIs, leave, hiring, compensation, and related administration. Features depend on your plan and configuration.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("2. Accounts and organizations")}
        </h2>
        <p>
          {t(
            "You must provide accurate information when creating an organization. You are responsible for admin credentials, employee accounts under your tenant, and lawful use of location and personal data for your workforce.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("3. Trials and billing")}
        </h2>
        <p>
          {t(
            "New organizations may receive a limited free trial. Paid subscriptions are managed inside the product. Fees, seat limits, and renewals follow the plan you select and any payment-provider terms.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("4. Acceptable use")}
        </h2>
        <p>
          {t(
            "You may not misuse the service, attempt unauthorized access, interfere with other tenants, or use Elevora in violation of employment, privacy, or location-tracking laws applicable to your operations.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("5. Data and privacy")}
        </h2>
        <p>
          {t(
            "Our handling of personal data is described in the Privacy Policy. Tenant data is isolated by organization. You remain the controller of employee data you upload or collect through the product.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("6. Availability and changes")}
        </h2>
        <p>
          {t(
            "We aim for reliable service but do not guarantee uninterrupted availability. We may update features and these Terms; continued use after notice constitutes acceptance of material changes where permitted by law.",
          )}
        </p>
        <h2 className="text-lg font-semibold text-foreground">
          {t("7. Contact")}
        </h2>
        <p>
          {t("Questions about these Terms:")}{" "}
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
