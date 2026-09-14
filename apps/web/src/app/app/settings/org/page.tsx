"use client";

import Link from "next/link";
import { OrgSetupPanel } from "@/components/employees/org-setup-panel";
import { Button } from "@/components/ui/button";
import { useUiRedesignGate } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

export default function SettingsOrgPage() {
  const { redesign } = useUiRedesignGate("/app/employees");

  if (!redesign) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("Settings")}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Org setup")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Job roles and branches, kept off the employee roster.")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/settings">{t("All settings")}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/employees">{t("Back to roster")}</Link>
          </Button>
        </div>
      </div>
      <OrgSetupPanel layout="stacked" />
    </div>
  );
}
