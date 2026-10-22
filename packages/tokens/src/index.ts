import tokensJson from "../tokens.json" with { type: "json" };

export type AccentPreset = "lime" | "teal" | "emerald" | "violet";
export type ColorTheme = "light" | "dark";

export const tokens = tokensJson;

export type ElevoraTokens = typeof tokensJson;

export function colorsFor(
  theme: ColorTheme = "light",
  accent: AccentPreset = "lime",
) {
  const base = theme === "dark" ? tokens.dark : tokens.light;
  const accentColors = tokens.accents[accent];
  return {
    ...base,
    ...accentColors,
    ...(theme === "dark" && accent === "teal"
      ? { accentStrong: "#4FC0DB", accentTint: "rgba(35,167,199,0.16)" }
      : {}),
  };
}

/** Flat CSS custom-property map for web or RN StyleSheet bridging. */
export function cssVariables(
  theme: ColorTheme = "light",
  accent: AccentPreset = "lime",
): Record<string, string> {
  const c = colorsFor(theme, accent);
  return {
    "--accent": c.accent,
    "--accent-strong": c.accentStrong,
    "--accent-soft": c.accentSoft,
    "--accent-tint": c.accentTint,
    "--accent-ink": c.accentInk,
    "--warn": c.warn,
    "--warn-soft": c.warnSoft,
    "--warn-text": c.warnText,
    "--yellow": c.yellow,
    "--danger": c.danger,
    "--danger-soft": c.dangerSoft,
    "--info": c.info,
    "--info-soft": c.infoSoft,
    "--canvas": c.canvas,
    "--frame": c.frame,
    "--surface": c.surface,
    "--surface-2": c.surface2,
    "--surface-3": c.surface3,
    "--line": c.line,
    "--line-strong": c.lineStrong,
    "--text": c.text,
    "--text-2": c.text2,
    "--muted": c.muted,
    "--faint": c.faint,
    "--bar-idle": c.barIdle,
    "--bar-idle-stripe": c.barIdleStripe,
    "--ink": c.ink,
    "--ink-text": c.inkText,
    "--map-land": c.mapLand,
    "--map-block": c.mapBlock,
    "--map-park": c.mapPark,
    "--map-water": c.mapWater,
    "--map-road": c.mapRoad,
    "--map-casing": c.mapCasing,
    "--map-major": c.mapMajor,
  };
}

export { nativeWindPreset } from "./nativewind-preset.js";
