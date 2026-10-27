import type { ExpoConfig } from "expo/config";

// There is no separate staging API yet, so preview builds talk to production
// (testers use the `acme` demo workspace).
const PRODUCTION_API_URL = "https://elevora-api.xaeons.com";

export const API_URLS = {
  development: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
  staging: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL,
  production: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL,
} as const;

const profile =
  (process.env.APP_ENV as keyof typeof API_URLS | undefined) ?? "development";

const config: ExpoConfig = {
  name: "Polara Field",
  slug: "elevora-field",
  scheme: "elevora",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: "https://u.expo.dev/b15bed18-646f-4ea1-96ac-b9816de19b8e",
  },
  ios: {
    bundleIdentifier: "com.xaeon.elevora",
    // Portrait phone UI; iPad support would add iPad screenshots + iPad review.
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Polara uses your location to verify clock-in inside your work zone.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Polara tracks your location only while you are on shift for field operations. Continued use of GPS running in the background can dramatically decrease battery life.",
      UIBackgroundModes: ["location", "remote-notification"],
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType:
            "NSPrivacyCollectedDataTypePreciseLocation",
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: [
            "NSPrivacyCollectedDataTypePurposeAppFunctionality",
          ],
        },
      ],
    },
  },
  android: {
    package: "com.xaeon.elevora",
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_LOCATION",
      "POST_NOTIFICATIONS",
    ],
    // Nothing in the app uses the camera yet; keep Play's permission review clean.
    blockedPermissions: ["android.permission.CAMERA"],
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-secure-store",
    "expo-localization",
    "expo-sqlite",
    "expo-location",
    "expo-task-manager",
    [
      "expo-notifications",
      {
        color: "#C8F000",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: API_URLS[profile] ?? API_URLS.development,
    appEnv: profile,
    privacyPolicyUrl:
      process.env.EXPO_PUBLIC_PRIVACY_URL ?? "https://elevora.xaeons.com/privacy",
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ?? "b15bed18-646f-4ea1-96ac-b9816de19b8e",
    },
  },
  owner: "xaeon-software-solutions",
};

export default config;
