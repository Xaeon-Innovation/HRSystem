"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, type AuthUser } from "@/lib/api";
import { isUiRedesignEnabled } from "@/lib/ui-redesign";

function useUiRedesignStatus() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(isUiRedesignEnabled(getUser()));
    sync();
    setReady(true);
    window.addEventListener("hr-ui-redesign", sync);
    window.addEventListener("hr-session-user", sync);
    return () => {
      window.removeEventListener("hr-ui-redesign", sync);
      window.removeEventListener("hr-session-user", sync);
    };
  }, []);

  return { enabled, ready };
}

/** Subscribe to redesign flag + session so pages can branch layouts. */
export function useUiRedesign() {
  return useUiRedesignStatus().enabled;
}

/**
 * For routes that only exist under redesign.
 * Waits until the flag is known before redirecting — otherwise the first
 * render (enabled=false) immediately bounces users away from Settings / Leave
 * subroutes even when UI v2 is on.
 */
export function useUiRedesignGate(fallbackHref: string) {
  const { enabled, ready } = useUiRedesignStatus();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!enabled) router.replace(fallbackHref);
  }, [ready, enabled, fallbackHref, router]);

  return { redesign: ready && enabled, ready };
}

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    window.addEventListener("hr-session-user", sync);
    return () => window.removeEventListener("hr-session-user", sync);
  }, []);
  return user;
}
