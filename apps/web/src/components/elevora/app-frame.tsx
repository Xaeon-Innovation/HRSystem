import * as React from "react";
import { cn } from "@/lib/utils";

export type AppFrameProps = {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AppFrame({ sidebar, children, className }: AppFrameProps) {
  return (
    <div
      className={cn(
        "grid h-dvh grid-cols-1 gap-2.5 bg-canvas p-2.5 frame:grid-cols-[248px_1fr]",
        className,
      )}
    >
      <div className="hidden min-h-0 min-w-0 frame:block">{sidebar}</div>
      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-frame",
        )}
      >
        {children}
      </main>
    </div>
  );
}
