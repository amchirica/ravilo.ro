import "server-only";
import { cache } from "react";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { sanitizeCmsHtml } from "@/lib/sanitize";
import { pickLocalized, type AppLocale } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { STOREFRONT_CACHE, isolateMemo } from "@/lib/storefront-cache";
import { normalizeBannerPlacement } from "@/lib/banner-placement";

type NavItem = {
  id: string;
  label: string;
  labelEn: string | null;
  url: string | null;
  sortOrder: number;
  isVisible: boolean;
};

type HomepageSection = {
  id: string;
  type: string;
  title: string;
  titleEn: string | null;
  subtitle: string | null;
  subtitleEn: string | null;
  content: unknown;
  contentEn: unknown;
  sortOrder: number;
  isEnabled: boolean;
  publishAt: Date | null;
  unpublishAt: Date | null;
};

type Announcement = {
  id: string;
  text: string;
  textEn: string | null;
  link: string | null;
  isEnabled: boolean;
  startAt: Date | null;
  endAt: Date | null;
};

async function loc(explicit?: AppLocale): Promise<AppLocale> {
  return explicit ?? requestLocale();
}

async function loadActiveHomepageSections() {
  if (!isSupabaseConfigured()) return [];
  const now = new Date();
  const { data } = await sb()
    .from("homepage_sections")
    .select("*")
    .eq("is_enabled", true)
    .order("sort_order", { ascending: true });
  return camelList<HomepageSection>(data).filter(
    (row) => (!row.publishAt || row.publishAt <= now) && (!row.unpublishAt || row.unpublishAt >= now),
  );
}

export const getActiveHomepageSections = cache(() =>
  isolateMemo(STOREFRONT_CACHE.homepage, loadActiveHomepageSections),
);

export function localizeHomepageSection(section: HomepageSection, locale: AppLocale) {
  const content = locale === "en" && section.contentEn ? section.contentEn : section.content;
  return {
    ...section,
    title: pickLocalized(section.title, section.titleEn, locale),
    subtitle: pickLocalized(section.subtitle, section.subtitleEn, locale),
    content,
  };
}

export async function getNavigation(location: "HEADER" | "MOBILE" | "FOOTER") {
  if (!isSupabaseConfigured()) return [];
  const { data: menu } = await sb().from("navigation_menus").select("id").eq("location", location).maybeSingle();
  if (!menu) return [];
  const { data: items } = await sb().from("navigation_items").select("*").eq("menu_id", menu.id);
  return camelList<NavItem>(items)
    .filter((item) => item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export type StoreBanner = {
  id: string;
  title: string;
  subtitle: string;
  imagePath: string | null;
  ctaLabel: string;
  ctaUrl: string;
  placement: string;
  startsAt: Date | null;
  endsAt: Date | null;
};

async function loadActiveBanners(placement: string): Promise<StoreBanner[]> {
  if (!isSupabaseConfigured()) return [];
  const now = new Date();
  const wanted = normalizeBannerPlacement(placement);
  const { data, error } = await sb().from("store_banners").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  if (error) return [];
  return camelList<StoreBanner>(data).filter((row) => {
    if (normalizeBannerPlacement(row.placement) !== wanted) return false;
    if (row.startsAt && row.startsAt > now) return false;
    if (row.endsAt && row.endsAt < now) return false;
    return Boolean(row.title || row.imagePath || row.ctaUrl);
  });
}

/** Per-request cache only. Banners must appear as soon as they are saved in admin. */
export const getActiveBanners = cache((placement: string) => loadActiveBanners(placement));

async function loadActiveAnnouncement() {
  if (!isSupabaseConfigured()) return null;
  const now = new Date();
  const { data } = await sb()
    .from("announcements")
    .select("*")
    .eq("is_enabled", true)
    .order("updated_at", { ascending: false });
  return (
    camelList<Announcement>(data).find(
      (row) => (!row.startAt || row.startAt <= now) && (!row.endAt || row.endAt >= now),
    ) ?? null
  );
}

export const getActiveAnnouncement = cache(() => isolateMemo(STOREFRONT_CACHE.announcement, loadActiveAnnouncement));

export async function getPublishedPage(slug: string, locale?: AppLocale) {
  if (!isSupabaseConfigured()) return null;
  const language = await loc(locale);
  const { data } = await sb().from("pages").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!data) return null;
  const page = camelKeys<{
    id: string;
    slug: string;
    title: string;
    titleEn: string | null;
    content: string;
    contentEn: string | null;
    seoTitle: string | null;
    seoTitleEn: string | null;
    seoDescription: string | null;
    seoDescriptionEn: string | null;
  }>(data);
  const content = pickLocalized(page.content, page.contentEn, language);
  return {
    ...page,
    title: pickLocalized(page.title, page.titleEn, language),
    seoTitle: pickLocalized(page.seoTitle, page.seoTitleEn, language) || null,
    seoDescription: pickLocalized(page.seoDescription, page.seoDescriptionEn, language) || null,
    content: sanitizeCmsHtml(content),
  };
}

export async function getEnabledFaqs(locale?: AppLocale, scope?: { productId?: string; categoryId?: string; global?: boolean }) {
  if (!isSupabaseConfigured()) return [];
  const language = await loc(locale);
  const { data } = await sb().from("faq_items").select("*").eq("is_enabled", true).order("sort_order", { ascending: true });
  return camelList<{
    id: string;
    question: string;
    questionEn: string | null;
    answer: string;
    answerEn: string | null;
    scope?: string;
    productId?: string | null;
    categoryId?: string | null;
  }>(data)
    .filter((item) => {
      if (!scope) return true;
      if (scope.productId) return item.scope === "product" && item.productId === scope.productId;
      if (scope.categoryId) return item.scope === "category" && item.categoryId === scope.categoryId;
      if (scope.global) return !item.scope || item.scope === "global";
      return true;
    })
    .map((item) => ({
    id: item.id,
    question: pickLocalized(item.question, item.questionEn, language),
    answer: pickLocalized(item.answer, item.answerEn, language),
  }));
}

export async function getPublishedArticles(take = 6, locale?: AppLocale, kind: "ARTICLE" | "GUIDE" | "ANY" = "ARTICLE") {
  if (!isSupabaseConfigured()) return [];
  const language = await loc(locale);
  const { data } = await sb()
    .from("articles")
    .select("*")
    .eq("status", "PUBLISHED")
    .order("published_at", { ascending: false })
    .limit(kind === "ANY" ? take : Math.max(take * 3, take));
  return camelList<{
    id: string;
    slug: string;
    title: string;
    titleEn: string | null;
    excerpt: string;
    excerptEn: string | null;
    contentKind?: string;
    category: string | null;
    publishedAt: Date | string | null;
  }>(data)
    .filter((article) => {
      const rowKind = article.contentKind === "GUIDE" ? "GUIDE" : "ARTICLE";
      return kind === "ANY" || rowKind === kind;
    })
    .slice(0, take)
    .map((article) => ({
      id: article.id,
      slug: article.slug,
      title: pickLocalized(article.title, article.titleEn, language),
      excerpt: pickLocalized(article.excerpt, article.excerptEn, language),
      kind: (article.contentKind === "GUIDE" ? "GUIDE" : "ARTICLE") as "ARTICLE" | "GUIDE",
      category: article.category,
      publishedAt: article.publishedAt,
      href: article.contentKind === "GUIDE" ? `/ghiduri/${article.slug}` : `/blog/${article.slug}`,
    }));
}

export async function getPublishedArticle(slug: string, locale?: AppLocale, expectedKind?: "ARTICLE" | "GUIDE") {
  if (!isSupabaseConfigured()) return null;
  const language = await loc(locale);
  const { data } = await sb().from("articles").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
  if (!data) return null;
  const article = camelKeys<{
    id: string;
    slug: string;
    title: string;
    titleEn: string | null;
    content: string;
    contentEn: string | null;
    excerpt: string;
    excerptEn: string | null;
    seoTitle: string | null;
    seoTitleEn: string | null;
    seoDescription: string | null;
    seoDescriptionEn: string | null;
    publishedAt: Date | null;
    author: string | null;
    category: string | null;
    contentKind?: string;
    updatedAt?: Date | string | null;
    coverUrl?: string | null;
  }>(data);
  const { data: links } = await sb().from("article_products").select("product_id").eq("article_id", article.id);
  const kind = article.contentKind === "GUIDE" ? "GUIDE" : "ARTICLE";
  if (expectedKind && kind !== expectedKind) return null;
  return {
    ...article,
    kind,
    title: pickLocalized(article.title, article.titleEn, language),
    excerpt: pickLocalized(article.excerpt, article.excerptEn, language),
    seoTitle: pickLocalized(article.seoTitle, article.seoTitleEn, language) || null,
    seoDescription: pickLocalized(article.seoDescription, article.seoDescriptionEn, language) || null,
    content: sanitizeCmsHtml(pickLocalized(article.content, article.contentEn, language)),
    products: links ?? [],
    href: kind === "GUIDE" ? `/ghiduri/${article.slug}` : `/blog/${article.slug}`,
  };
}

async function loadActiveCategories(language: AppLocale) {
  if (!isSupabaseConfigured()) return [];
  const { data } = await sb()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });
  return camelList<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string;
    descriptionEn: string | null;
    heroImage: string | null;
  }>(data).map((category) => ({
    id: category.id,
    slug: category.slug,
    name: pickLocalized(category.name, category.nameEn, language),
    description: pickLocalized(category.description, category.descriptionEn, language),
    heroImage: category.heroImage,
  }));
}

export const getActiveCategories = cache(async (locale?: AppLocale) => {
  const language = await loc(locale);
  return isolateMemo(`${STOREFRONT_CACHE.categories}:${language}`, () => loadActiveCategories(language));
});

export async function getCategoryBySlug(slug: string, locale?: AppLocale) {
  if (!isSupabaseConfigured()) return null;
  const language = await loc(locale);
  const { data } = await sb().from("categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data
    ? (() => {
        const category = camelKeys<{
          id: string;
          name: string;
          nameEn: string | null;
          slug: string;
          description: string;
          descriptionEn: string | null;
          seoTitle: string | null;
          seoTitleEn: string | null;
          seoDescription: string | null;
          seoDescriptionEn: string | null;
          heroImage: string | null;
          seoContent?: string | null;
        }>(data);
        return {
          id: category.id,
          slug: category.slug,
          name: pickLocalized(category.name, category.nameEn, language),
          description: pickLocalized(category.description, category.descriptionEn, language),
          seoTitle: pickLocalized(category.seoTitle, category.seoTitleEn, language) || null,
          seoDescription: pickLocalized(category.seoDescription, category.seoDescriptionEn, language) || null,
          heroImage: category.heroImage,
          seoContent: category.seoContent || "",
        };
      })()
    : null;
}

export async function getChildCategories(parentId: string, locale?: AppLocale) {
  if (!isSupabaseConfigured()) return [];
  const language = await loc(locale);
  const { data } = await sb().from("categories").select("*").eq("parent_id", parentId).eq("is_active", true);
  return camelList<{ id: string; name: string; nameEn: string | null; slug: string }>(data)
    .map((child) => ({
      id: child.id,
      slug: child.slug,
      name: pickLocalized(child.name, child.nameEn, language),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCollectionBySlug(slug: string, locale?: AppLocale) {
  if (!isSupabaseConfigured()) return null;
  const language = await loc(locale);
  const { data } = await sb().from("collections").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) return null;
  const collection = camelKeys<{
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    description: string | null;
    descriptionEn: string | null;
    seoTitle: string | null;
    seoTitleEn: string | null;
    seoDescription: string | null;
    seoDescriptionEn: string | null;
  }>(data);
  return {
    id: collection.id,
    slug: collection.slug,
    name: pickLocalized(collection.name, collection.nameEn, language),
    description: pickLocalized(collection.description, collection.descriptionEn, language),
    seoTitle: pickLocalized(collection.seoTitle, collection.seoTitleEn, language) || null,
    seoDescription: pickLocalized(collection.seoDescription, collection.seoDescriptionEn, language) || null,
  };
}

export async function getArticleCategoryBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await sb().from("article_categories").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (error || !data) return null;
  return camelKeys<{
    id: string;
    name: string;
    slug: string;
    description: string;
    metaTitle: string | null;
    metaDescription: string | null;
  }>(data);
}
