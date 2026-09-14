"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";

type Hsl = { h: number; s: number; l: number };

type GradientColors = {
  start: string;
  end: string;
  first: string;
  second: string;
  third: string;
  fourth: string;
  fifth: string;
};

const FALLBACK_DARK: GradientColors = {
  start: "rgb(18, 24, 28)",
  end: "rgb(12, 16, 20)",
  first: "12, 107, 151",
  second: "32, 160, 176",
  third: "56, 170, 196",
  fourth: "14, 90, 120",
  fifth: "40, 140, 132",
};

const FALLBACK_LIGHT: GradientColors = {
  start: "rgb(248, 250, 252)",
  end: "rgb(241, 245, 249)",
  first: "12, 107, 151",
  second: "32, 160, 176",
  third: "56, 170, 196",
  fourth: "14, 90, 120",
  fifth: "40, 140, 132",
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

function rgbTriple(h: number, s: number, l: number) {
  return hslToRgb({ h, s, l });
}

function readColors(isDark: boolean): GradientColors {
  const styles = getComputedStyle(document.documentElement);
  const primary =
    parseHsl(styles.getPropertyValue("--primary")) ?? {
      h: 199,
      s: 85,
      l: 32,
    };
  const bg =
    parseHsl(styles.getPropertyValue("--background")) ?? {
      h: isDark ? 222 : 220,
      s: isDark ? 14 : 16,
      l: isDark ? 7 : 98,
    };

  const start = `rgb(${rgbTriple(bg.h, bg.s, bg.l)})`;
  const end = `rgb(${rgbTriple(bg.h, Math.max(bg.s - 4, 0), isDark ? Math.max(bg.l - 3, 0) : Math.min(bg.l - 2, 100))})`;

  return {
    start,
    end,
    first: rgbTriple(primary.h, isDark ? 55 : 60, isDark ? 48 : 42),
    second: rgbTriple(primary.h + 18, isDark ? 50 : 55, isDark ? 52 : 46),
    third: rgbTriple(primary.h - 12, isDark ? 48 : 52, isDark ? 44 : 40),
    fourth: rgbTriple(primary.h + 8, isDark ? 42 : 48, isDark ? 40 : 38),
    fifth: rgbTriple(primary.h + 28, isDark ? 45 : 50, isDark ? 50 : 44),
  };
}

/** App-shell atmosphere using BackgroundGradientAnimation (Aceternity). */
export function PageAtmosphere() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [colors, setColors] = useState<GradientColors>(
    isDark ? FALLBACK_DARK : FALLBACK_LIGHT,
  );

  useEffect(() => {
    const sync = () => {
      const dark = document.documentElement.classList.contains("dark");
      setColors(readColors(dark));
    };
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
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden contain-strict"
    >
      <BackgroundGradientAnimation
        interactive={false}
        blendingValue="soft-light"
        size="85%"
        gradientBackgroundStart={colors.start}
        gradientBackgroundEnd={colors.end}
        firstColor={colors.first}
        secondColor={colors.second}
        thirdColor={colors.third}
        fourthColor={colors.fourth}
        fifthColor={colors.fifth}
        containerClassName="absolute inset-0 h-full w-full"
      />
      <div className="absolute inset-0 bg-background/45 dark:bg-background/50" />
    </div>
  );
}
