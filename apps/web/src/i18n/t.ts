import { getLocale, type AppLocale } from "@/lib/locale";
import { ar } from "./ar";

export type TVars = Record<string, string | number>;

/**
 * Kept for call sites that await Arabic before switching locale.
 * Dictionary is already in the module graph (required for SSR/client hydration parity).
 */
export async function loadArabic(): Promise<Record<string, string>> {
  return ar;
}

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
