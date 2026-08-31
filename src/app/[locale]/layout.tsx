import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { CookieBanner } from "@/components/consent/cookie-banner";
import { Analytics } from "@/components/analytics/analytics";
import { Suspense } from "react";
import type { Metadata } from "next";
import { localeAlternates, type AppLocale } from "@/lib/i18n";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    alternates: localeAlternates("/", locale as AppLocale, appUrl),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "ro" | "en")) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
      <Suspense>
        <CookieBanner />
      </Suspense>
      <Analytics />
    </NextIntlClientProvider>
  );
}
