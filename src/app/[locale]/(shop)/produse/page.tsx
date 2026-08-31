import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogBrowser } from "@/components/storefront/catalog-browser";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    title: t("products"),
    alternates: localeAlternates("/produse", locale as AppLocale, appUrl),
  };
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    categorie?: string;
    min?: string;
    max?: string;
    pretMin?: string;
    pretMax?: string;
    stock?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const query = await searchParams;
  return (
    <CatalogBrowser
      locale={locale as AppLocale}
      query={{
        ...query,
        min: query.min ?? query.pretMin,
        max: query.max ?? query.pretMax,
      }}
      title={t("products")}
    />
  );
}
