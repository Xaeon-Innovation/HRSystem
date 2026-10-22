const tokens = require("./tokens.json");

/**
 * Colors resolve through CSS variables so ThemeProvider can swap light/dark
 * (and accent) at runtime via nativewind `vars()` / documentElement.
 * Fallbacks match light tokens for first paint before vars apply.
 */
function v(name, fallback) {
  return `var(--${name}, ${fallback})`;
}

const L = tokens.light;

/** CommonJS preset for Tailwind/NativeWind configs that use require(). */
const nativeWindPreset = {
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: v("accent", L.accent),
          strong: v("accent-strong", L.accentStrong),
          soft: v("accent-soft", L.accentSoft),
          tint: v("accent-tint", L.accentTint),
          ink: v("accent-ink", L.accentInk),
        },
        warn: {
          DEFAULT: v("warn", L.warn),
          soft: v("warn-soft", L.warnSoft),
          text: v("warn-text", L.warnText),
        },
        yellow: v("yellow", L.yellow),
        danger: {
          DEFAULT: v("danger", L.danger),
          soft: v("danger-soft", L.dangerSoft),
        },
        info: {
          DEFAULT: v("info", L.info),
          soft: v("info-soft", L.infoSoft),
        },
        canvas: v("canvas", L.canvas),
        frame: v("frame", L.frame),
        surface: {
          DEFAULT: v("surface", L.surface),
          2: v("surface-2", L.surface2),
          3: v("surface-3", L.surface3),
        },
        line: {
          DEFAULT: v("line", L.line),
          strong: v("line-strong", L.lineStrong),
        },
        ink: {
          DEFAULT: v("ink", L.ink),
          text: v("ink-text", L.inkText),
        },
        muted: v("muted", L.muted),
        faint: v("faint", L.faint),
        "bar-idle": v("bar-idle", L.barIdle),
        text: {
          DEFAULT: v("text", L.text),
          2: v("text-2", L.text2),
        },
      },
      borderRadius: {
        card: `${tokens.radii.card}px`,
        sheet: `${tokens.radii.sheet}px`,
        tile: `${tokens.radii.tile}px`,
        tabbar: `${tokens.radii.tabBar}px`,
      },
    },
  },
};

module.exports = { nativeWindPreset, default: nativeWindPreset };
