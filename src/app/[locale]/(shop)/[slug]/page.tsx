import { notFound } from "next/navigation";
import { getPublishedPage } from "@/services/cms";
import { Container } from "@/components/ui/primitives";
import type { Metadata } from "next";
import { localeAlternates, type AppLocale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  const page = await getPublishedPage(slug, locale as AppLocale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!page) return { title: "Pagină" };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: localeAlternates(`/${slug}`, locale as AppLocale, appUrl),
  };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const page = await getPublishedPage(slug, locale as AppLocale);
  if (!page) notFound();
  return (
    <Container className="prose-ravilo max-w-3xl py-16">
      <h1 className="font-display text-5xl">{page.title}</h1>
      <div className="mt-8 space-y-4 text-lg leading-relaxed text-ink-2" dangerouslySetInnerHTML={{ __html: page.content }} />
    </Container>
  );
}
