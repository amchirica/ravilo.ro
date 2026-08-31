import { notFound } from "next/navigation";
import { getPublishedCollection } from "@/services/collections";
import { listPublishedProducts } from "@/services/catalog";
import { getEnabledFaqs, getPublishedArticles } from "@/services/cms";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Container } from "@/components/ui/primitives";
import { StoreImage } from "@/components/storefront/store-image";
import { FaqList } from "@/components/storefront/faq-list";
import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const collection = await getPublishedCollection(slug, locale as AppLocale);
  if (!collection) return { title: "Colecție" };
  return {
    title: collection.seoTitle ?? collection.name,
    description: collection.seoDescription ?? collection.description,
    alternates: localeAlternates(`/colectie/${collection.slug}`, locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000"),
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as AppLocale;
  const t = await getTranslations("catalog");
  const collection = await getPublishedCollection(slug, locale);
  if (!collection) notFound();
  const [{ items }, faqs, guides] = await Promise.all([
    listPublishedProducts({ collectionSlug: slug, take: 48, locale }),
    getEnabledFaqs(locale, { global: true }),
    getPublishedArticles(3, locale, "GUIDE"),
  ]);
  return (
    <article>
      {collection.imagePath ? (
        <div className="relative aspect-[16/7] w-full bg-surface md:aspect-[21/8]">
          <StoreImage src={collection.imagePath} alt="" fill className="object-cover" sizes="100vw" priority />
        </div>
      ) : null}
      <Container className="py-16">
        <p className="eyebrow">{t("collectionsTitle")}</p>
        <h1 className="mt-3 font-display text-5xl">{collection.name}</h1>
        {collection.description ? <p className="mt-4 max-w-2xl text-lg text-mute">{collection.description}</p> : null}
        <div className="mt-10">
          {items.length ? <ProductGrid products={items} /> : <EmptyState title={t("emptyCollection")} />}
        </div>
        {collection.editorialHtml ? (
          <div className="prose-ravilo mt-16 max-w-2xl text-ink-2" dangerouslySetInnerHTML={{ __html: collection.editorialHtml }} />
        ) : null}
        {guides.length ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl">{t("guidesAndArticles")}</h2>
            <ul className="mt-4 grid gap-3">
              {guides.map((guide) => (
                <li key={guide.id}>
                  <Link href={guide.href} className="text-mute hover:text-ink">
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <FaqList items={faqs} title="FAQ" />
      </Container>
    </article>
  );
}
