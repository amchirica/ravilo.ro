import { listPublishedCollections } from "@/services/collections";
import { Container, PageTitle } from "@/components/ui/primitives";
import { EmptyState } from "@/components/storefront/empty-state";
import { StoreImage } from "@/components/storefront/store-image";
import { Link } from "@/i18n/routing";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  return { title: t("collectionsTitle"), description: t("collectionsIntro"), alternates: localeAlternates("/colectii", locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000") };
}

export default async function CollectionsIndexPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("catalog");
  const collections = await listPublishedCollections(locale);
  return (
    <Container className="py-12 md:py-16">
      <PageTitle title={t("collectionsTitle")} description={t("collectionsIntro")} />
      {collections.length === 0 ? (
        <EmptyState title={t("emptyCollection")} />
      ) : (
        <ul className="grid gap-10 md:grid-cols-2 md:gap-12">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Link prefetch={false} href={`/colectie/${collection.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-surface md:aspect-[5/4]">
                  {collection.imagePath ? (
                    <StoreImage
                      src={collection.imagePath}
                      alt={collection.name}
                      fill
                      className="object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : null}
                </div>
                <h2 className="mt-5 font-display text-3xl tracking-[-0.03em]">{collection.name}</h2>
                {collection.description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-mute">{collection.description}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
