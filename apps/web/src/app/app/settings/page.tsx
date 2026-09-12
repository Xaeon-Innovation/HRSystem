"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, MapPinned, Palette } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandingSheet } from "@/components/branding-sheet";
import { useUiRedesignGate } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { getUser } from "@/lib/api";
import { t } from "@/i18n";

const LINKS = [
  {
    href: "/app/settings/org",
    title: t("Org setup"),
    description: t("Job roles, branches, and sites for the roster."),
    icon: Building2,
  },
  {
    href: "/app/map",
    title: t("Live map appearance"),
    description: t("Map themes and marker colors on the live map page."),
    icon: MapPinned,
  },
] as const;

export default function SettingsPage() {
  const { redesign } = useUiRedesignGate("/app");
  const [brandOpen, setBrandOpen] = useState(false);
  const isAdmin = getUser()?.role === "tenant_admin";

  if (!redesign) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Settings")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Org structure, branding, and map appearance — day-to-day People work stays under Employees and Leave.")}</p>
      </div>

      <div className="grid gap-3">
        {LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="transition-colors group-hover:border-primary/30">
                <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}

        {isAdmin ? (
          <button
            type="button"
            className="group w-full text-left"
            onClick={() => setBrandOpen(true)}
          >
            <Card className="transition-colors group-hover:border-primary/30">
              <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                <Palette className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">{t("Branding")}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("Display name, logo, and color preset for this tenant.")}</p>
                </div>
              </CardHeader>
            </Card>
          </button>
        ) : null}
      </div>

      <BrandingSheet open={brandOpen} onOpenChange={setBrandOpen} />
    </div>
  );
}
