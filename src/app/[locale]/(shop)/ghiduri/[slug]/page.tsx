import { setRequestLocale } from "next-intl/server";
import { ArticleView, articleMetadata } from "@/components/storefront/article-view";
import type { AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  return articleMetadata(slug, locale as AppLocale, "GUIDE");
}

export default async function GuideArticlePage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  return <ArticleView slug={slug} locale={locale as AppLocale} kind="GUIDE" />;
}
