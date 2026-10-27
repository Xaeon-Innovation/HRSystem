"use client";

import { MarketingHero } from "@/components/marketing/hero";
import { ModuleStrip } from "@/components/marketing/module-strip";
import { ConnectedViews } from "@/components/marketing/connected-views";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ProductBento } from "@/components/marketing/bento";
import { WhoItsFor } from "@/components/marketing/who-its-for";
import { FinalCta } from "@/components/marketing/final-cta";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] min-w-0 overflow-x-clip px-4 sm:px-8">
      <MarketingHero />
      <ModuleStrip />
      <ConnectedViews />
      <HowItWorks />
      <ProductBento />
      <WhoItsFor />
      <FinalCta />
    </div>
  );
}
