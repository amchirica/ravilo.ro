import { getPublishedPage } from "@/services/cms";
import { Container } from "@/components/ui/primitives";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";
import { localeAlternates } from "@/lib/i18n";
import { sanitizeCmsHtml } from "@/lib/sanitize";

export async function cmsPageMetadata(slug: string, fallbackTitle: string, locale: string): Promise<Metadata> {
  const page = await getPublishedPage(slug, locale as AppLocale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    title: page?.seoTitle ?? page?.title ?? fallbackTitle,
    description: page?.seoDescription ?? undefined,
    alternates: localeAlternates(`/${slug}`, locale as AppLocale, appUrl),
  };
}

export async function CmsOrFallbackPage({
  slug,
  fallbackTitle,
  fallbackHtml,
}: {
  slug: string;
  fallbackTitle: string;
  fallbackHtml: string;
}) {
  const locale = (await getLocale()) as AppLocale;
  const page = await getPublishedPage(slug, locale);
  return (
    <Container className="prose-ravilo max-w-3xl py-16">
      <h1 className="font-display text-5xl">{page?.title ?? fallbackTitle}</h1>
      <div
        className="mt-8 space-y-4 text-lg leading-relaxed text-ink-2"
        dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(page?.content || fallbackHtml) }}
      />
    </Container>
  );
}
