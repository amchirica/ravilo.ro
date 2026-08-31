import type { Metadata } from "next";
import { Instrument_Serif, Manrope } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { getStoreSettings } from "@/services/settings";
import { AppThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/components/theme/theme-boot";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getStoreSettings();
    return {
      metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
      title: { default: settings.defaultSeoTitle, template: `%s — ${settings.storeName}` },
      description: settings.defaultSeoDescription,
      icons: {
        icon: [{ url: "/favicon.ico", sizes: "any" }],
        apple: "/apple-touch-icon.png",
      },
      openGraph: { title: settings.defaultSeoTitle, description: settings.defaultSeoDescription, locale: "ro_RO", type: "website" },
      robots: { index: true, follow: true },
      alternates: {
        languages: {
          "ro-RO": "/",
          en: "/en",
          "x-default": "/",
        },
      },
    };
  } catch {
    return {
      title: "RAVILO",
      description: "Lucruri bune. Alese simplu.",
      icons: { icon: "/favicon.ico" },
    };
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={`${sans.variable} ${serif.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppThemeProvider>{children}</AppThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
