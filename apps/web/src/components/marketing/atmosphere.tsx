/** Quiet marketing background, flat with a soft top wash, no floating blobs. */
export function MarketingAtmosphere() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-x-0 top-0 h-[50vh] bg-[radial-gradient(ellipse_at_top,_hsl(199_85%_32%/0.08),_transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,_hsl(199_70%_40%/0.12),_transparent_70%)]" />
    </div>
  );
}
