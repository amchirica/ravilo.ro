import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCategoryBySlug } from "@/services/cms";
import { CatalogBrowser } from "@/components/storefront/catalog-browser";
import { StoreBanners } from "@/components/storefront/store-banners";
import { localeAlternates, type AppLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const category = await getCategoryBySlug(slug, locale as AppLocale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!category) return { title: "Categorie" };
  return {
    title: category.seoTitle ?? category.name,
    description: category.seoDescription ?? category.description,
    alternates: localeAlternates(`/categorie/${slug}`, locale as AppLocale, appUrl),
    robots: { index: true, follow: true },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ q?: string; min?: string; max?: string; stock?: string; sort?: string; page?: string }>;
}) {
  const { slug, locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as AppLocale;
  const query = await searchParams;
  const t = await getTranslations("catalog");
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();
  return (
    <>
      <StoreBanners placement="category" />
      <CatalogBrowser
      locale={locale}
      query={query}
      categorySlug={slug}
      title={category.name}
      description={category.description || t("seeCategory")}
      seoContent={category.seoContent || undefined}
    />
    </>
  );
}
