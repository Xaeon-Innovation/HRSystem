import { describe, expect, it } from "vitest";
import { setRuntimeLocale } from "@/lib/locale";
import { t } from "./t";

describe("t", () => {
  it("returns English by default", () => {
    setRuntimeLocale("en");
    expect(t("Sign in")).toBe("Sign in");
    expect(t("{n}m ago", { n: 10 })).toBe("10m ago");
  });

  it("translates Arabic without flipping layout keys", () => {
    setRuntimeLocale("ar");
    expect(t("Sign in")).toBe("تسجيل الدخول");
    expect(t("{n}m ago", { n: 10 })).toBe("منذ 10 د");
    expect(t("Dashboard")).toBe("لوحة التحكم");
    expect(t("Arabic uses the same layout as English, only the words change.")).toBe(
      "العربية تستخدم نفس التخطيط كالإنجليزية, تتغير الكلمات فقط.",
    );
    setRuntimeLocale("en");
  });
});
