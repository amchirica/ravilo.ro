import { notFound } from "next/navigation";
import { Container } from "@/components/ui/primitives";
import { ProductGrid } from "@/components/storefront/product-grid";
import { EditorialHero } from "@/components/storefront/editorial-hero";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublishedArticle } from "@/services/cms";
import { getPublishedProductById } from "@/services/catalog";
import { formatDate } from "@/lib/format";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export async function articleMetadata(slug: string, locale: AppLocale, kind: "ARTICLE" | "GUIDE"): Promise<Metadata> {
  const article = await getPublishedArticle(slug, locale, kind);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const path = kind === "GUIDE" ? `/ghiduri/${slug}` : `/blog/${slug}`;
  if (!article) return { title: kind === "GUIDE" ? "Guide" : "Blog" };
  return {
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt,
    alternates: localeAlternates(path, locale, appUrl),
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      images: article.coverUrl ? [article.coverUrl] : undefined,
    },
  };
}

export async function ArticleView({ slug, locale, kind }: { slug: string; locale: AppLocale; kind: "ARTICLE" | "GUIDE" }) {
  const t = await getTranslations();
  const article = await getPublishedArticle(slug, locale, kind);
  if (!article) notFound();
  const kindLabel = kind === "GUIDE" ? t("editorial.guides") : t("editorial.blog");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const path = article.href;
  const products = (
    await Promise.all((article.products ?? []).map((row) => getPublishedProductById((row as { product_id: string }).product_id, locale)))
  ).filter((item): item is NonNullable<typeof item> => Boolean(item));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": kind === "GUIDE" ? "Article" : "BlogPosting",
      inLanguage: locale === "en" ? "en" : "ro-RO",
      headline: article.title,
      description: article.excerpt,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt ?? article.publishedAt,
      author: { "@type": "Person", name: article.author || "RAVILO" },
      image: article.coverUrl ? [article.coverUrl] : undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "RAVILO", item: appUrl },
        { "@type": "ListItem", position: 2, name: kindLabel, item: `${appUrl}${kind === "GUIDE" ? "/ghiduri" : "/blog"}` },
        { "@type": "ListItem", position: 3, name: article.title, item: `${appUrl}${path}` },
      ],
    },
  ];
  const ctaHref = article.ctaUrl?.trim();
  return (
    <article>
      <JsonLd data={jsonLd} />
      <EditorialHero
        crumbs={
          <p className="text-xs uppercase tracking-[0.2em] text-mute">
            <Link href="/">RAVILO</Link>
            {" / "}
            <Link href={kind === "GUIDE" ? "/ghiduri" : "/blog"}>{kindLabel}</Link>
            {article.category ? ` / ${article.category}` : null}
          </p>
        }
        title={article.title}
        description={article.excerpt}
        meta={<p className="mt-3 text-sm text-mute">{formatDate(article.publishedAt, locale)}</p>}
        image={article.coverUrl}
        imageAlt={article.title}
        cta={ctaHref ? { href: ctaHref, label: article.ctaLabel?.trim() || t("editorial.seeProducts") } : null}
      />
      <Container className="max-w-3xl pb-16">
        <div className="prose-ravilo space-y-4 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content }} />
        {products.length ? (
          <section className="mt-16">
            <h2 className="font-display text-3xl tracking-[-0.03em]">{t("product.recommended")}</h2>
            <div className="mt-6">
              <ProductGrid products={products} />
            </div>
          </section>
        ) : null}
      </Container>
    </article>
  );
}
