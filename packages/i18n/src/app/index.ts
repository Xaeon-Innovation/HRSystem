export { appEn, type AppMessageKey } from "./en.js";
export { appAr } from "./ar.js";

import { appAr } from "./ar.js";
import { appEn, type AppMessageKey } from "./en.js";

export function tApp(
  key: AppMessageKey,
  locale: "en" | "ar" = "en",
): string {
  return locale === "ar" ? appAr[key] : appEn[key];
}
