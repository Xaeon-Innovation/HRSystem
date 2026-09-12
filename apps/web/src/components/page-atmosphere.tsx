"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  BubbleBackground,
  type BubbleColors,
} from "@/components/animate-ui/components/backgrounds/bubble";

type Hsl = { h: number; s: number; l: number };

const FALLBACK_COLORS: BubbleColors = {
  first: "12, 107, 151",
  second: "32, 160, 176",
  third: "14, 90, 120",
  fourth: "196, 154, 108",
  fifth: "40, 140, 132",
  sixth: "56, 170, 196",
};

function parseHsl(raw: string): Hsl | null {
  const m = raw.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!m) return null;
  return { h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) };
}

function hslToRgb({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    return Math.round(
      255 * (light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)),
    );
  };
  return `${f(0)}, ${f(8)}, ${f(4)}`;
}

function rgb(h: number, s: number, l: number) {
  return hslToRgb({ h, s, l });
}

function readBubbleColors(): BubbleColors {
  const styles = getComputedStyle(document.documentElement);
  const primary =
    parseHsl(styles.getPropertyValue("--primary")) ?? {
      h: 199,
      s: 85,
      l: 32,
    };
  const accentFg =
    parseHsl(styles.getPropertyValue("--accent-foreground")) ?? {
      h: 175,
      s: 50,
      l: 22,
    };
  const isDark = document.documentElement.classList.contains("dark");

  return {
    first: rgb(primary.h, 48, isDark ? 50 : 58),
    second: rgb(primary.h + 22, 42, isDark ? 54 : 62),
    third: rgb(primary.h - 14, 40, isDark ? 44 : 52),
    fourth: rgb(32, 30, isDark ? 46 : 68),
    fifth: rgb(accentFg.h, 38, isDark ? 50 : 58),
    sixth: rgb(primary.h + 10, 44, isDark ? 56 : 60),
  };
}

export function PageAtmosphere() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<BubbleColors>(FALLBACK_COLORS);

  useEffect(() => {
    const sync = () => setColors(readBubbleColors());

    sync();
    window.addEventListener("hr-tenant-brand", sync);
    window.addEventListener("hr-ui-redesign", sync);

    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-ui-redesign", "data-brand", "style"],
    });

    return () => {
      window.removeEventListener("hr-tenant-brand", sync);
      window.removeEventListener("hr-ui-redesign", sync);
      obs.disconnect();
    };
  }, [resolvedTheme]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 isolate overflow-hidden"
    >
      <div className="absolute -inset-[22%] blur-[56px]">
        <BubbleBackground
          interactive={false}
          colors={colors}
          className="absolute inset-0 bg-transparent"
        />
      </div>
      <div className="absolute inset-0 bg-background/40 dark:bg-background/48" />
    </div>
  );
}
