import { listBestsellers } from "@/services/bestsellers";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Container } from "@/components/ui/primitives";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  return { title: t("bestTitle"), description: t("bestIntro"), alternates: localeAlternates("/best-sellers", locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000") };
}

export default async function BestSellersPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("catalog");
  const items = await listBestsellers(locale, 24);
  return (
    <Container className="py-16">
      <h1 className="font-display text-5xl">{t("bestTitle")}</h1>
      <p className="mt-4 max-w-xl text-mute">{t("bestIntro")}</p>
      <div className="mt-10">
        {items.length ? <ProductGrid products={items} /> : <EmptyState title={t("bestEmpty")} />}
      </div>
    </Container>
  );
}
