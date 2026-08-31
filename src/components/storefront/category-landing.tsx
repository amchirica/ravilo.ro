import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategoryBySlug, getChildCategories, getPublishedArticles } from "@/services/cms";
import { listPublishedProducts } from "@/services/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EmptyState } from "@/components/storefront/empty-state";
import { Container } from "@/components/ui/primitives";
import { localeAlternates, type AppLocale } from "@/lib/i18n";

export async function categoryLandingMetadata(slug: string): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const category = await getCategoryBySlug(slug, locale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!category) return { title: "RAVILO" };
  return {
    title: category.seoTitle ?? `${category.name} — RAVILO`,
    description: category.seoDescription ?? category.description,
    alternates: localeAlternates(`/${slug}`, locale, appUrl),
  };
}

export async function CategoryLanding({ slug }: { slug: string }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("catalog");
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();
  const children = await getChildCategories(category.id, locale);
  const { items } = await listPublishedProducts({ categorySlug: slug, take: 12, locale });
  const articles = await getPublishedArticles(2, locale);
  return (
    <div>
      <section className="border-b border-line bg-surface">
        <Container className="py-16 md:py-24">
          <p className="eyebrow">RAVILO / {category.name}</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.04em]">{category.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-mute">{category.description}</p>
        </Container>
      </section>
      {children.length > 0 ? (
        <section className="py-12">
          <Container>
            <h2 className="font-display text-3xl tracking-[-0.03em]">{t("subcategories")}</h2>
            <div className="mt-6 grid grid-cols-2 gap-px bg-line md:grid-cols-4">
              {children.map((child) => (
                <Link key={child.id} href={`/categorie/${child.slug}`} className="bg-paper px-4 py-8 transition-colors hover:bg-surface">
                  {child.name}
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}
      <section className="py-12">
        <Container>
          <h2 className="font-display text-3xl tracking-[-0.03em]">{t("products")}</h2>
          <div className="mt-8">
            {items.length ? <ProductGrid products={items} /> : <EmptyState title={t("empty")} hint={t("emptyHint")} />}
          </div>
          <Link href={`/categorie/${slug}`} className="mt-8 inline-block text-xs uppercase tracking-[0.16em]">
            {t("seeCategory")}
          </Link>
        </Container>
      </section>
      <section className="border-t border-line py-12">
        <Container className="max-w-3xl">
          <h2 className="font-display text-3xl tracking-[-0.03em]">{t("notes")}</h2>
          <p className="mt-4 text-mute">{category.description}</p>
          <div className="mt-8 grid gap-4">
            {articles.map((article) => (
              <Link key={article.id} href={`/blog/${article.slug}`} className="block border-b border-line pb-3">
                {article.title}
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </div>
  );
}
