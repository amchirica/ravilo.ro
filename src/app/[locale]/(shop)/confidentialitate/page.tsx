import { CmsOrFallbackPage, cmsPageMetadata } from "@/components/storefront/cms-or-fallback";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return cmsPageMetadata("confidentialitate", t("privacyTitle"), locale);
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return <CmsOrFallbackPage slug="confidentialitate" fallbackTitle={t("privacyTitle")} fallbackHtml={String(t.raw("privacyHtml"))} />;
}
