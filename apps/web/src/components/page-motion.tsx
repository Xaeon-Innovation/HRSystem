"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type ApiInflightDetail = { count: number };

/**
 * Top bar that starts on internal nav and stays until route data settles
 * (in-flight `api()` calls go quiet), not merely when the pathname flips.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"idle" | "loading" | "finishing">("idle");
  const [inflight, setInflight] = useState(0);
  const [settleEpoch, setSettleEpoch] = useState(0);
  const timers = useRef<{
    finish?: ReturnType<typeof setTimeout>;
    quiet?: ReturnType<typeof setTimeout>;
    max?: ReturnType<typeof setTimeout>;
    grace?: ReturnType<typeof setTimeout>;
  }>({});
  const graceReady = useRef(false);

  function clearTimers(except?: "finish") {
    const t = timers.current;
    if (except !== "finish" && t.finish) clearTimeout(t.finish);
    if (t.quiet) clearTimeout(t.quiet);
    if (t.max) clearTimeout(t.max);
    if (t.grace) clearTimeout(t.grace);
    if (except !== "finish") t.finish = undefined;
    t.quiet = undefined;
    t.max = undefined;
    t.grace = undefined;
  }

  function beginLoading() {
    clearTimers();
    graceReady.current = false;
    setPhase("loading");
    timers.current.grace = setTimeout(() => {
      graceReady.current = true;
      setSettleEpoch((n) => n + 1);
    }, 70);
    timers.current.max = setTimeout(() => {
      setPhase("finishing");
      timers.current.finish = setTimeout(() => setPhase("idle"), 240);
    }, 8_000);
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        return;
      }
      beginLoading();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // intentionally stable click handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onInflight = (event: Event) => {
      const detail = (event as CustomEvent<ApiInflightDetail>).detail;
      if (detail && typeof detail.count === "number") {
        setInflight(detail.count);
      }
    };
    window.addEventListener("hr-api-inflight", onInflight);
    return () => window.removeEventListener("hr-api-inflight", onInflight);
  }, []);

  // Browser back/forward: treat path change as a load if we weren't already loading.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (phase === "idle") {
      beginLoading();
    } else if (phase === "loading") {
      graceReady.current = false;
      if (timers.current.grace) clearTimeout(timers.current.grace);
      timers.current.grace = setTimeout(() => {
        graceReady.current = true;
        setSettleEpoch((n) => n + 1);
      }, 70);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (phase !== "loading") return;
    if (!graceReady.current) return;

    if (inflight > 0) {
      if (timers.current.quiet) clearTimeout(timers.current.quiet);
      timers.current.quiet = undefined;
      return;
    }

    if (timers.current.quiet) clearTimeout(timers.current.quiet);
    timers.current.quiet = setTimeout(() => {
      clearTimers("finish");
      setPhase("finishing");
      timers.current.finish = setTimeout(() => setPhase("idle"), 240);
    }, 60);

    return () => {
      if (timers.current.quiet) clearTimeout(timers.current.quiet);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, inflight, settleEpoch, pathname]);

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle") return null;

  return (
    <div
      className={cn(
        "nav-progress",
        phase === "finishing" && "nav-progress--done",
      )}
      aria-hidden
    />
  );
}

/** Soft enter animation whenever the app route changes. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter min-w-0">
      {children}
    </div>
  );
}
