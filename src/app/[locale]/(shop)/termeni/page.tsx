import { CmsOrFallbackPage, cmsPageMetadata } from "@/components/storefront/cms-or-fallback";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return cmsPageMetadata("termeni", t("termsTitle"), locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <CmsOrFallbackPage slug="termeni" fallbackTitle={t("termsTitle")} fallbackHtml={String(t.raw("termsHtml"))} />;
}
