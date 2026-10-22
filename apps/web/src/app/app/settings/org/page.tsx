"use client";

import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { OrgSetupPanel } from "@/components/employees/org-setup-panel";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elevora";
import { t } from "@/i18n";

export default function SettingsOrgPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumbs={
          <span className="inline-flex flex-wrap items-center gap-1">
            <Link href="/app/settings" className="hover:text-ink">
              {t("Settings")}
            </Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden />
            <span className="text-ink">{t("Org setup")}</span>
          </span>
        }
        title={t("Org setup")}
        subtitle={t("Job roles, branches and sites used by the roster.")}
        actions={
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              document
                .getElementById("org-add-branch")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
              document
                .querySelector<HTMLInputElement>("#org-add-branch input")
                ?.focus();
            }}
          >
            <Plus className="h-4 w-4" aria-hidden />
            {t("Add branch")}
          </Button>
        }
      />
      <OrgSetupPanel layout="grid" />
    </div>
  );
}
