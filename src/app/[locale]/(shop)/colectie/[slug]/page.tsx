import { notFound } from "next/navigation";
import { getPublishedCollection } from "@/services/collections";
import { listPublishedProducts } from "@/services/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Breadcrumb, Container, Section, SectionHeader } from "@/components/ui/primitives";
import { StoreImage } from "@/components/storefront/store-image";
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
    openGraph: collection.imagePath ? { images: [collection.imagePath] } : undefined,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as AppLocale;
  const t = await getTranslations("catalog");
  const tNav = await getTranslations("nav");
  const collection = await getPublishedCollection(slug, locale);
  if (!collection) notFound();
  const { items } = await listPublishedProducts({ collectionSlug: slug, take: 48, locale });
  return (
    <article>
      <Container className="pt-8 md:pt-10">
        <Breadcrumb
          items={[
            { href: "/", label: "RAVILO" },
            { href: "/colectii", label: t("collectionsTitle") },
            { label: collection.name },
          ]}
        />
      </Container>
      <section>
        <Container className="grid items-end gap-10 py-10 md:grid-cols-12 md:gap-12 md:py-16 lg:py-20">
          <div className="md:col-span-5">
            <p className="eyebrow">{t("collectionsTitle")}</p>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,5vw,4.5rem)] leading-[0.95] tracking-[-0.04em]">
              {collection.name}
            </h1>
            {collection.description ? (
              <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-mute">{collection.description}</p>
            ) : null}
            <p className="mt-6 text-[0.6875rem] uppercase tracking-[0.16em] text-mute">{t("count", { count: items.length })}</p>
          </div>
          <div className="relative aspect-[4/5] bg-surface md:col-span-7 md:aspect-[5/4]">
            {collection.imagePath ? (
              <StoreImage
                src={collection.imagePath}
                alt={collection.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 58vw"
                priority
              />
            ) : null}
          </div>
        </Container>
      </section>
      {collection.editorialHtml ? (
        <section className="border-y border-line">
          <Container className="py-16 md:py-20">
            <div className="prose-ravilo max-w-2xl text-mute" dangerouslySetInnerHTML={{ __html: collection.editorialHtml }} />
          </Container>
        </section>
      ) : null}
      <Section>
        <Container>
          <SectionHeader title={tNav("products")} subtitle={t("count", { count: items.length })} />
          {items.length ? (
            <ProductGrid products={items} />
          ) : (
            <EmptyState title={t("emptyCollection")} hint={t("emptyCollectionHint")} actionHref="/produse" actionLabel={tNav("products")} />
          )}
        </Container>
      </Section>
    </article>
  );
}
