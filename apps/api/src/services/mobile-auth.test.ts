import { describe, expect, it } from "vitest";
import {
  accentFromTenantSettings,
  hashRefreshToken,
  newRefreshToken,
} from "./mobile-auth.js";

describe("mobile-auth helpers", () => {
  it("maps brand presets to accent presets", () => {
    expect(accentFromTenantSettings({ brandPreset: "teal" })).toBe("teal");
    expect(accentFromTenantSettings({ brandPreset: "forest" })).toBe("emerald");
    expect(accentFromTenantSettings({ brandPreset: "neutral" })).toBe("lime");
    expect(accentFromTenantSettings(undefined)).toBe("lime");
  });

  it("hashes refresh tokens stably", () => {
    const raw = newRefreshToken();
    expect(hashRefreshToken(raw)).toBe(hashRefreshToken(raw));
    expect(hashRefreshToken(raw)).not.toBe(hashRefreshToken(raw + "x"));
  });

  it("issues opaque refresh tokens", () => {
    const a = newRefreshToken();
    const b = newRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(32);
  });
});
