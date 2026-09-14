import { cn } from "@/lib/utils";

/** Full-viewport marketing section: min-height, not max, tall phones still scroll. */
export function MarketingSection({
  children,
  className,
  id,
  contained = true,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Wrap children in max-w-6xl horizontal padding. */
  contained?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "flex min-h-[100svh] flex-col justify-center scroll-mt-24",
        "py-16 pb-28 sm:py-20 md:pb-20 md:pt-24",
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
