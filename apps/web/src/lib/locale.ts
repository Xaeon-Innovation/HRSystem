const LOCALE_KEY = "hr_locale";
const COOKIE = "hr_locale";

export type AppLocale = "en" | "ar";

let runtimeLocale: AppLocale | null = null;

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "ar" || value === "en";
}

export function setRuntimeLocale(locale: AppLocale | null) {
  runtimeLocale = locale;
}

export function getLocale(): AppLocale {
  if (runtimeLocale) return runtimeLocale;
  if (typeof window === "undefined") return "en";
  const cookie = readCookie(COOKIE);
  if (isAppLocale(cookie)) return cookie;
  try {
    const raw = window.localStorage.getItem(LOCALE_KEY);
    if (isAppLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "en";
}

export function setLocale(locale: AppLocale) {
  runtimeLocale = locale;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
  writeCookie(COOKIE, locale);
  applyLocaleToDocument(locale);
  window.dispatchEvent(new Event("hr-locale"));
}

export function applyLocaleToDocument(locale: AppLocale = getLocale()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = locale;
  // Keep the existing LTR chrome. Arabic copy sits in the same places;
  // the browser still shapes Arabic glyphs correctly inside each string.
  root.dir = "ltr";
  root.dataset.locale = locale;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;SameSite=Lax`;
}
