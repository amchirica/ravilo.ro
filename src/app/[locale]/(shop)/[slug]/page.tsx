import { notFound } from "next/navigation";
import { getPublishedPage } from "@/services/cms";
import { Container } from "@/components/ui/primitives";
import { EditorialHero } from "@/components/storefront/editorial-hero";
import type { Metadata } from "next";
import { localeAlternates, type AppLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const page = await getPublishedPage(slug, locale as AppLocale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!page) return { title: "Pagină" };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? page.excerpt ?? undefined,
    alternates: localeAlternates(`/${slug}`, locale as AppLocale, appUrl),
    openGraph: page.coverUrl ? { images: [page.coverUrl] } : undefined,
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const page = await getPublishedPage(slug, locale as AppLocale);
  if (!page) notFound();
  return (
    <article>
      <EditorialHero title={page.title} description={page.excerpt} image={page.coverUrl} imageAlt={page.title} />
      <Container className="prose-ravilo max-w-3xl pb-16">
        <div className="space-y-4 text-lg leading-relaxed text-ink-2" dangerouslySetInnerHTML={{ __html: page.content }} />
      </Container>
    </article>
  );
}
