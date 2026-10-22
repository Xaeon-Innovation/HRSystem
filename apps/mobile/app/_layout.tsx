import "../global.css";
import { useEffect, type ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, View } from "react-native";
import { I18nProvider } from "@/lib/i18n";
import { initSentry } from "@/lib/sentry";
import { useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/lib/theme";

initSentry();

function Bootstrap({ children }: { children: ReactNode }) {
  const hydrate = useSession((s) => s.hydrate);
  const hydrated = useSession((s) => s.hydrated);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        // Dynamic import so web never loads expo-sqlite / SharedArrayBuffer.
        const { migrateLocalDb } = require("@/lib/db/client") as typeof import("@/lib/db/client");
        migrateLocalDb();
      } catch (err) {
        console.warn("local db migrate failed", err);
      }
      try {
        const { ensureTrackingTasksDefined } =
          require("@/lib/tracking") as typeof import("@/lib/tracking");
        ensureTrackingTasksDefined();
      } catch (err) {
        console.warn("tracking tasks init failed", err);
      }
    }
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return <View className="flex-1 bg-frame" />;
  }
  return <>{children}</>;
}

function ThemedChrome({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      {children}
    </>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <Bootstrap>
          <ThemedChrome>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemedChrome>
        </Bootstrap>
      </ThemeProvider>
    </I18nProvider>
  );
}
