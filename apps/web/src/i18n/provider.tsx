"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  applyLocaleToDocument,
  getLocale,
  setRuntimeLocale,
  type AppLocale,
} from "@/lib/locale";
import { t } from "./t";

const LocaleContext = createContext<AppLocale>("en");

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);
  setRuntimeLocale(locale);

  useEffect(() => {
    const next = getLocale();
    setRuntimeLocale(next);
    setLocaleState(next);
    applyLocaleToDocument(next);
    const onLocale = () => {
      const loc = getLocale();
      setRuntimeLocale(loc);
      setLocaleState(loc);
      applyLocaleToDocument(loc);
    };
    window.addEventListener("hr-locale", onLocale);
    return () => window.removeEventListener("hr-locale", onLocale);
  }, []);

  return (
    <LocaleContext.Provider value={locale}>
      <div key={locale} className="contents">
        {children}
      </div>
    </LocaleContext.Provider>
  );
}

export function useLocale(): AppLocale {
  return useContext(LocaleContext);
}

export function useT() {
  const locale = useLocale();
  return (text: string, vars?: Record<string, string | number>) => {
    void locale;
    return t(text, vars);
  };
}
