import type { MetadataRoute } from "next";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";

const RESERVED_PAGES = new Set([
  "admin",
  "auth",
  "cos",
  "checkout",
  "cont",
  "favorite",
  "produse",
  "categorii",
  "categorie",
  "produs",
  "blog",
  "ghiduri",
  "cautare",
  "api",
  "journal",
]);

function localized(appUrl: string, path: string): MetadataRoute.Sitemap {
  const clean = path === "/" ? "" : path;
  return [
    { url: `${appUrl}${clean}`, alternates: { languages: { "ro-RO": `${appUrl}${clean}`, en: `${appUrl}/en${clean}`, "x-default": `${appUrl}${clean}` } } },
    { url: `${appUrl}/en${clean}`, alternates: { languages: { "ro-RO": `${appUrl}${clean}`, en: `${appUrl}/en${clean}`, "x-default": `${appUrl}${clean}` } } },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.APP_URL ?? "https://ravilo.ro";
  const entries: MetadataRoute.Sitemap = [
    ...localized(appUrl, "/"),
    ...localized(appUrl, "/produse"),
    ...localized(appUrl, "/categorii"),
    ...localized(appUrl, "/blog"),
    ...localized(appUrl, "/noutati"),
    ...localized(appUrl, "/colectii"),
    ...localized(appUrl, "/best-sellers"),
    ...localized(appUrl, "/pachete"),
    ...localized(appUrl, "/recenzii"),
    ...localized(appUrl, "/ghiduri"),
    ...localized(appUrl, "/cautare"),
    ...["livrare", "retur", "despre", "termeni", "confidentialitate", "contact", "faq", "cookies"].flatMap((slug) =>
      localized(appUrl, `/${slug}`),
    ),
  ];
  if (!isSupabaseConfigured()) return entries;
  try {
    const [products, categories, collections, pages, articles] = await Promise.all([
      sb().from("products").select("slug, updated_at").eq("status", "ACTIVE").eq("is_active", true),
      sb().from("categories").select("slug, updated_at").eq("is_active", true),
      sb().from("collections").select("slug, updated_at").eq("is_active", true),
      sb().from("pages").select("slug, updated_at").eq("status", "PUBLISHED"),
      sb().from("articles").select("slug, updated_at, content_kind").eq("status", "PUBLISHED"),
    ]);
    const articleRows = articles.error
      ? ((await sb().from("articles").select("slug, updated_at").eq("status", "PUBLISHED")).data ?? [])
      : (articles.data ?? []);
    return [
      ...entries,
      ...(products.data ?? []).flatMap((row) => localized(appUrl, `/produs/${row.slug}`)),
      ...(categories.data ?? []).flatMap((row) => localized(appUrl, `/categorie/${row.slug}`)),
      ...(collections.data ?? []).flatMap((row) => localized(appUrl, `/colectie/${row.slug}`)),
      ...(pages.data ?? [])
        .filter((row) => !RESERVED_PAGES.has(String(row.slug)))
        .flatMap((row) => localized(appUrl, `/${row.slug}`)),
      ...articleRows.flatMap((row) => {
        const kind = "content_kind" in row ? row.content_kind : "ARTICLE";
        return localized(appUrl, kind === "GUIDE" ? `/ghiduri/${row.slug}` : `/blog/${row.slug}`);
      }),
    ];
  } catch {
    return entries;
  }
}
