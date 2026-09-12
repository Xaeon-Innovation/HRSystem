import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Sans, Noto_Sans_Arabic } from "next/font/google";
import { BrandProvider } from "@/components/brand-provider";
import { PageAtmosphere } from "@/components/page-atmosphere";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/i18n/provider";
import { isAppLocale, setRuntimeLocale } from "@/lib/locale";
import "./globals.css";
import { t } from "@/i18n";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
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
    title: t("HR Track"),
    description: t("Multi-tenant HR & workforce location tracking"),
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: t("HR Track"),
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

  return (
    <html lang={locale} dir="ltr" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${notoArabic.variable} font-sans`}>
        <ThemeProvider>
          <LocaleProvider initialLocale={locale}>
            <BrandProvider>
              <PageAtmosphere />
              <div className="relative z-10 min-w-0">{children}</div>
            </BrandProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
