import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/i18n/provider";
import { t } from "@/i18n";
import { isAppLocale, setRuntimeLocale } from "@/lib/locale";
import "./globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-ar",
  display: "swap",
  preload: false,
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#EDEDEB",
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

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={plexArabic.variable}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans" data-locale={locale}>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
