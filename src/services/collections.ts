import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { pickLocalized, type AppLocale } from "@/lib/i18n";
import { requestLocale } from "@/lib/request-locale";
import { sanitizeCmsHtml } from "@/lib/sanitize";

export type PublicCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imagePath: string | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  editorialHtml: string;
};

type CollectionRow = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string | null;
  descriptionEn: string | null;
  imagePath: string | null;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoTitleEn: string | null;
  seoDescription: string | null;
  seoDescriptionEn: string | null;
  canonicalUrl: string | null;
  editorialHtml: string | null;
  sortOrder: number;
};

function mapCollection(row: CollectionRow, locale: AppLocale): PublicCollection {
  return {
    id: row.id,
    name: pickLocalized(row.name, row.nameEn, locale),
    slug: row.slug,
    description: pickLocalized(row.description ?? "", row.descriptionEn, locale),
    imagePath: row.imagePath,
    isFeatured: Boolean(row.isFeatured),
    seoTitle: pickLocalized(row.seoTitle, row.seoTitleEn, locale) || null,
    seoDescription: pickLocalized(row.seoDescription, row.seoDescriptionEn, locale) || null,
    canonicalUrl: row.canonicalUrl,
    editorialHtml: sanitizeCmsHtml(row.editorialHtml ?? ""),
  };
}

export async function listPublishedCollections(locale?: AppLocale, featuredOnly = false): Promise<PublicCollection[]> {
  if (!isSupabaseConfigured()) return [];
  const language = locale ?? (await requestLocale());
  let query = sb().from("collections").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  if (featuredOnly) query = query.eq("is_featured", true);
  const { data, error } = await query;
  if (error) {
    const fallback = await sb().from("collections").select("*").eq("is_active", true);
    return camelList<CollectionRow>(fallback.data).map((row) => mapCollection(row, language));
  }
  return camelList<CollectionRow>(data).map((row) => mapCollection(row, language));
}

export async function getPublishedCollection(slug: string, locale?: AppLocale): Promise<PublicCollection | null> {
  if (!isSupabaseConfigured()) return null;
  const language = locale ?? (await requestLocale());
  const { data } = await sb().from("collections").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!data) return null;
  return mapCollection(camelKeys<CollectionRow>(data), language);
}
