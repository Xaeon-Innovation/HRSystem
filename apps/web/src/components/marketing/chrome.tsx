"use client";

import { usePathname } from "next/navigation";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function MarketingChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_PATHS.has(pathname);

  return (
    <div className="min-h-dvh min-w-0 bg-canvas p-2.5">
      <div className="flex min-h-[calc(100dvh-20px)] min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-frame">
        {isAuth ? null : <MarketingHeader />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
        {isAuth ? null : <MarketingFooter />}
      </div>
    </div>
  );
}
