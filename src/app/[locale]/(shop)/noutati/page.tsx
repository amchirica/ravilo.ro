import { listPublishedProducts } from "@/services/catalog";
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
  return { title: t("newTitle"), description: t("newIntro"), alternates: localeAlternates("/noutati", locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000") };
}

export default async function NewArrivalsPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("catalog");
  const { items } = await listPublishedProducts({ isNew: true, take: 48, locale, sort: "newest" });
  return (
    <Container className="py-16">
      <p className="eyebrow">{t("new")}</p>
      <h1 className="mt-3 font-display text-5xl">{t("newTitle")}</h1>
      <p className="mt-4 max-w-xl text-mute">{t("newIntro")}</p>
      <div className="mt-10">
        {items.length ? <ProductGrid products={items} /> : <EmptyState title={t("empty")} hint={t("emptyHint")} />}
      </div>
    </Container>
  );
}
