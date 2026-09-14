"use client";

import Link from "next/link";
import { MarketingHero } from "@/components/marketing/hero";
import { ModuleStrip } from "@/components/marketing/module-strip";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ProductBento } from "@/components/marketing/bento";
import { WhoItsFor } from "@/components/marketing/who-its-for";
import { FinalCta } from "@/components/marketing/final-cta";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";

export default function HomePage() {
  const t = useT();

  return (
    <div className="min-w-0 overflow-x-clip pb-20 md:pb-0">
      <MarketingHero />
      <ModuleStrip />
      <HowItWorks />
      <ProductBento />
      <WhoItsFor />
      <FinalCta />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary/20 bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto max-w-lg">
          <Button
            asChild
            className="min-h-12 w-full text-base shadow-lg shadow-primary/35"
          >
            <Link href="/signup">{t("Start free trial")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
