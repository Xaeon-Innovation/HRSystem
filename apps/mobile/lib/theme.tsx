import {
  colorsFor,
  cssVariables,
  type AccentPreset,
  type ColorTheme,
} from "@hr/tokens";
import { colorScheme, vars } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform, useColorScheme, View } from "react-native";

type ThemeCtx = {
  theme: ColorTheme;
  accent: AccentPreset;
  colors: ReturnType<typeof colorsFor>;
  setThemeOverride: (t: ColorTheme | "system") => void;
  setAccent: (a: AccentPreset) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

const THEME_KEY = "elevora.theme";
const ACCENT_KEY = "elevora.accent";

function readStoredTheme(): ColorTheme | "system" {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return "system";
  }
  const v = localStorage.getItem(THEME_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function readStoredAccent(): AccentPreset {
  if (Platform.OS !== "web" || typeof localStorage === "undefined") {
    return "lime";
  }
  const v = localStorage.getItem(ACCENT_KEY);
  if (v === "lime" || v === "teal" || v === "emerald" || v === "violet") {
    return v;
  }
  return "lime";
}

function applyWebDocumentTheme(
  theme: ColorTheme,
  accent: AccentPreset,
) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  const map = cssVariables(theme, accent);
  for (const [key, value] of Object.entries(map)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverrideState] = useState<ColorTheme | "system">(
    readStoredTheme,
  );
  const [accent, setAccentState] = useState<AccentPreset>(readStoredAccent);
  const theme: ColorTheme =
    override === "system" ? (system === "dark" ? "dark" : "light") : override;

  const setOverride = (t: ColorTheme | "system") => {
    setOverrideState(t);
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(THEME_KEY, t);
    }
  };
  const setAccent = (a: AccentPreset) => {
    setAccentState(a);
    if (Platform.OS === "web" && typeof localStorage !== "undefined") {
      localStorage.setItem(ACCENT_KEY, a);
    }
  };

  const colors = useMemo(() => colorsFor(theme, accent), [theme, accent]);
  const varStyle = useMemo(
    () => vars(cssVariables(theme, accent)),
    [theme, accent],
  );

  useEffect(() => {
    try {
      colorScheme.set(theme);
    } catch {
      /* media darkMode or non-browser — CSS vars still apply */
    }
    applyWebDocumentTheme(theme, accent);
  }, [theme, accent]);

  const value = useMemo(
    () => ({
      theme,
      accent,
      colors,
      setThemeOverride: setOverride,
      setAccent,
    }),
    [theme, accent, colors],
  );

  return (
    <Ctx.Provider value={value}>
      <View style={[{ flex: 1 }, varStyle]} className="flex-1 bg-frame">
        {children}
      </View>
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}
