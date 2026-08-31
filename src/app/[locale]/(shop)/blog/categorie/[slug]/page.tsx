import { getArticleCategoryBySlug, getPublishedArticles } from "@/services/cms";
import { Container } from "@/components/ui/primitives";
import { EmptyState } from "@/components/storefront/empty-state";
import { Link } from "@/i18n/routing";
import type { AppLocale } from "@/lib/i18n";
import { localeAlternates } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const category = await getArticleCategoryBySlug(slug);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    title: category?.metaTitle ?? category?.name ?? "Blog",
    description: category?.metaDescription ?? category?.description,
    alternates: localeAlternates(`/blog/categorie/${slug}`, locale as AppLocale, appUrl),
  };
}

export default async function BlogCategoryPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("editorial");
  const category = await getArticleCategoryBySlug(slug);
  const articles = (await getPublishedArticles(48, locale as AppLocale, "ARTICLE")).filter((article) => {
    if (category) return article.category === category.name;
    return article.category && article.category.toLowerCase().replace(/\s+/g, "-") === slug;
  });
  if (!category && articles.length === 0) notFound();
  return (
    <Container className="py-16">
      <h1 className="font-display text-5xl">{category?.name ?? articles[0]?.category ?? slug}</h1>
      {category?.description ? <p className="mt-3 max-w-2xl text-mute">{category.description}</p> : null}
      {articles.length === 0 ? (
        <div className="mt-10">
          <EmptyState title={t("emptyCategory")} />
        </div>
      ) : (
        <ul className="mt-10">
          {articles.map((article) => (
            <li key={article.id} className="border-t border-line py-8">
              <Link href={`/blog/${article.slug}`} className="group block max-w-2xl">
                <h2 className="font-display text-3xl tracking-[-0.03em] group-hover:text-mute">{article.title}</h2>
                <p className="mt-2 text-mute">{article.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
