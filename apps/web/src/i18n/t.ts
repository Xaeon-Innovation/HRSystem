import { getLocale, type AppLocale } from "@/lib/locale";
import { ar } from "./ar";

export type TVars = Record<string, string | number>;

export function t(text: string, vars?: TVars): string {
  const locale = getLocale();
  let out = locale === "ar" ? (ar[text] ?? text) : text;
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      out = out.split(`{${key}}`).join(String(value));
    }
  }
  return out;
}

export function intlLocale(locale: AppLocale = getLocale()): string {
  return locale === "ar" ? "ar" : "en-GB";
}

export function intlNumberOptions(
  extra: Intl.NumberFormatOptions = {},
): Intl.NumberFormatOptions {
  return { numberingSystem: "latn", ...extra };
}

export function intlDateOptions(
  extra: Intl.DateTimeFormatOptions = {},
): Intl.DateTimeFormatOptions {
  return { numberingSystem: "latn", ...extra };
}
