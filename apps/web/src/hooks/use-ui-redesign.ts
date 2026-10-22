/**
 * Redesign is the only UI. These hooks remain as no-ops for any leftover imports.
 */

/** Always true — Elevora redesign is the only shell. */
export function useUiRedesign() {
  return true;
}

/**
 * Always ready and enabled — never redirects away from redesigned routes.
 */
export function useUiRedesignGate(_fallbackHref: string) {
  return { enabled: true, ready: true };
}
