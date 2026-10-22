import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadConfig(appEnv: string) {
  vi.resetModules();
  vi.stubEnv("APP_ENV", appEnv);
  vi.stubEnv("EXPO_PUBLIC_API_URL", "");
  vi.stubEnv("EXPO_PUBLIC_PRIVACY_URL", "");
  delete process.env.EXPO_PUBLIC_API_URL;
  delete process.env.EXPO_PUBLIC_PRIVACY_URL;
  return (await import("./app.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("app.config store builds", () => {
  for (const env of ["production", "staging"]) {
    it(`${env} points at the live HTTPS API and privacy policy`, async () => {
      const config = await loadConfig(env);
      expect(config.extra?.apiUrl).toBe("https://elevora-api.xaeons.com");
      expect(config.extra?.privacyPolicyUrl).toBe(
        "https://elevora.xaeons.com/privacy",
      );
    });
  }

  it("references icon assets that exist", async () => {
    const config = await loadConfig("production");
    const paths = [
      config.icon,
      config.android?.adaptiveIcon?.foregroundImage,
      config.android?.adaptiveIcon?.backgroundImage,
      config.android?.adaptiveIcon?.monochromeImage,
    ];
    for (const p of paths) {
      expect(p).toBeTruthy();
      expect(existsSync(resolve(__dirname, p!))).toBe(true);
    }
  });

  it("only requests permissions the app uses", async () => {
    const config = await loadConfig("production");
    expect(config.android?.permissions).not.toContain("CAMERA");
    expect(config.ios?.infoPlist?.NSCameraUsageDescription).toBeUndefined();
    expect(config.ios?.infoPlist?.UIBackgroundModes).not.toContain("fetch");
  });
});
