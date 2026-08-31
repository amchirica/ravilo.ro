import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArticleIndex } from "@/components/storefront/article-index";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("editorial");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return { title: t("blog"), alternates: localeAlternates("/blog", locale as AppLocale, appUrl) };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("editorial");
  return <ArticleIndex locale={locale as AppLocale} kind="ARTICLE" title={t("blog")} empty={t("emptyArticles")} />;
}
