/**
 * Sentry bootstrap — no-op until EXPO_PUBLIC_SENTRY_DSN is set.
 * Keeps the app free of hard dependency failures in local/web preview.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // Optional peer — install `@sentry/react-native` in release builds.
    const Sentry = require("@sentry/react-native") as {
      init: (opts: Record<string, unknown>) => void;
    };
    Sentry.init({
      dsn,
      enableInExpoDevelopment: false,
      tracesSampleRate: 0.1,
    });
  } catch (err) {
    console.warn("Sentry init skipped", err);
  }
}
