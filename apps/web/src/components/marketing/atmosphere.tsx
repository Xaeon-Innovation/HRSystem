"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

/** Marketing atmosphere using BackgroundGradientAnimation (Aceternity). */
export function MarketingAtmosphere() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden contain-strict"
    >
      <BackgroundGradientAnimation
        interactive={false}
        blendingValue={isDark ? "soft-light" : "multiply"}
        size={isDark ? "85%" : "70%"}
        gradientBackgroundStart={
          isDark ? "rgb(18, 24, 28)" : "rgb(252, 253, 254)"
        }
        gradientBackgroundEnd={
          isDark ? "rgb(12, 16, 20)" : "rgb(244, 247, 250)"
        }
        firstColor={isDark ? "12, 107, 151" : "180, 210, 225"}
        secondColor={isDark ? "32, 160, 176" : "200, 220, 230"}
        thirdColor={isDark ? "56, 170, 196" : "190, 215, 228"}
        fourthColor={isDark ? "14, 90, 120" : "210, 225, 235"}
        fifthColor={isDark ? "40, 140, 132" : "195, 218, 220"}
        containerClassName="absolute inset-0 h-full w-full"
      />
      {/* Light mode needs a heavier veil so cards stay crisp against the wash. */}
      <div className="absolute inset-0 bg-background/72 dark:bg-background/52" />
    </div>
  );
}
