/**
 * Shared Elevora i18n dictionaries.
 *
 * Web today uses English source strings as keys (`t("Clock in")`) with an
 * Arabic lookup table. Mobile adds a structured `app.*` namespace below.
 *
 * Migration note: prefer importing from `@hr/i18n` in new code. Web
 * `apps/web/src/i18n/ar.ts` re-exports the shared Arabic table.
 */
export { ar } from "./ar.js";
export { appEn, appAr, type AppMessageKey } from "./app/index.js";

export type SharedLocale = "en" | "ar";

/** Resolve a web-style English-key string for Arabic (identity for English). */
export function translateWebKey(
  text: string,
  locale: SharedLocale,
  dictionary: Record<string, string>,
): string {
  if (locale !== "ar") return text;
  return dictionary[text] ?? text;
}
