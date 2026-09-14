import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Noto_Sans_Arabic, Sora } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/i18n/provider";
import { t } from "@/i18n";
import { isAppLocale, setRuntimeLocale } from "@/lib/locale";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#3d4450",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const raw = jar.get("hr_locale")?.value;
  const locale = isAppLocale(raw) ? raw : "en";
  setRuntimeLocale(locale);
  return {
    title: {
      default: "Elevora",
      template: "%s · Elevora",
    },
    description: t(
      "Mobile-first HR, workforce clock-in, KPIs, and live field tracking, a Xaeon product.",
    ),
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Elevora",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jar = await cookies();
  const raw = jar.get("hr_locale")?.value;
  const locale = isAppLocale(raw) ? raw : "en";
  setRuntimeLocale(locale);
  // Arabic dictionary is sync-imported for SSR/hydration parity.

  const fontClass =
    locale === "ar"
      ? `${dmSans.variable} ${sora.variable} ${notoArabic.variable} font-sans`
      : `${dmSans.variable} ${sora.variable} font-sans`;

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <body className={fontClass} data-locale={locale}>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
