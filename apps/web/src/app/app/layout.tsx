import { BrandProvider } from "@/components/brand-provider";
import { PageAtmosphere } from "@/components/page-atmosphere";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <PageAtmosphere />
      <div className="relative z-10 min-w-0">
        <AppShell>{children}</AppShell>
      </div>
    </BrandProvider>
  );
}
