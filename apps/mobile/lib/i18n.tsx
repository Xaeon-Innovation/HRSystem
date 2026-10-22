import { appAr, appEn, type AppMessageKey } from "@hr/i18n";
import i18n from "i18next";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: appEn as Record<string, string> },
    ar: { translation: appAr as Record<string, string> },
  },
  interpolation: { escapeValue: false },
});

type Locale = "en" | "ar";

type I18nCtx = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: AppMessageKey) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  const setLocale = (next: Locale) => {
    const rtl = next === "ar";
    if (I18nManager.isRTL !== rtl) {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
    void i18n.changeLanguage(next);
    setLocaleState(next);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: AppMessageKey) => i18n.t(key),
    }),
    [locale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppI18n outside I18nProvider");
  return ctx;
}
