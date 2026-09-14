import { MarketingAtmosphere } from "@/components/marketing/atmosphere";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh min-w-0">
      <MarketingAtmosphere />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <MarketingHeader />
        <main className="min-w-0 flex-1">{children}</main>
        <MarketingFooter />
      </div>
    </div>
  );
}
