import { cn } from "@/lib/utils";

/** Marketing section. Hero uses full viewport; compact sections use padding only. */
export function MarketingSection({
  children,
  className,
  id,
  contained = true,
  compact = false,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Wrap children in max-w-6xl horizontal padding. */
  contained?: boolean;
  /** Drop min-h viewport so the page reads as continuous content. */
  compact?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "flex flex-col justify-center scroll-mt-24",
        compact
          ? "py-14 sm:py-16 md:py-20"
          : "min-h-[100svh] py-16 pb-28 sm:py-20 md:pb-20 md:pt-24",
        className,
      )}
    >
      {contained ? (
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
