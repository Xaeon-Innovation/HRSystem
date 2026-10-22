import { BrandProvider } from "@/components/brand-provider";
import { AppShell } from "@/components/app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandProvider>
      <div className="relative z-10 min-w-0">
        <AppShell>{children}</AppShell>
      </div>
    </BrandProvider>
  );
}
