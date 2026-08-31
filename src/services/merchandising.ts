import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { getPublishedProductById, listPublishedProducts } from "@/services/catalog";
import type { AppLocale } from "@/lib/i18n";

export async function getRelatedProducts(
  productId: string,
  kind: "RELATED" | "UPSELL" | "CROSS_SELL" | "FREQUENTLY_BOUGHT",
  locale: AppLocale,
  take = 4,
) {
  if (!isSupabaseConfigured()) return [];
  const first = await sb()
    .from("product_relations")
    .select("related_product_id, sort_order")
    .eq("product_id", productId)
    .eq("kind", kind)
    .order("sort_order", { ascending: true })
    .limit(take);
  const data =
    first.error && kind === "FREQUENTLY_BOUGHT"
      ? (
          await sb()
            .from("product_relations")
            .select("related_product_id, sort_order")
            .eq("product_id", productId)
            .eq("kind", "RELATED")
            .order("sort_order", { ascending: true })
            .limit(take)
        ).data
      : first.data;
  const ids = (data ?? []).map((row) => row.related_product_id as string);
  const products = await Promise.all(ids.map((id) => getPublishedProductById(id, locale)));
  return products.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

async function expandQuery(term: string): Promise<string[]> {
  const q = term.trim().toLowerCase().slice(0, 40);
  if (!isSupabaseConfigured() || q.length < 2) return [q];
  const { data } = await sb().from("search_synonyms").select("term, synonym");
  const extra = new Set<string>([q]);
  for (const row of data ?? []) {
    const termRow = String(row.term).toLowerCase();
    const syn = String(row.synonym).toLowerCase();
    if (termRow === q) extra.add(syn);
    if (syn === q) extra.add(termRow);
  }
  return [...extra];
}

export async function suggestSearch(term: string, locale: AppLocale) {
  const variants = await expandQuery(term);
  const q = variants[0] ?? "";
  if (q.length < 2) return { products: [], categories: [], collections: [], articles: [], guides: [], boosts: [] };
  const search = variants.join(" ");
  const [{ items }, { data: categories }, { data: collections }, { data: articles }, { data: boosts }, { data: promotions }] = await Promise.all([
    listPublishedProducts({ search, take: 5, locale }),
    isSupabaseConfigured()
      ? sb().from("categories").select("name, slug").eq("is_active", true).ilike("name", `%${q.replace(/[%_]/g, " ")}%`).limit(4)
      : Promise.resolve({ data: [] as { name: string; slug: string }[] }),
    isSupabaseConfigured()
      ? sb().from("collections").select("name, slug").eq("is_active", true).ilike("name", `%${q.replace(/[%_]/g, " ")}%`).limit(4)
      : Promise.resolve({ data: [] as { name: string; slug: string }[] }),
    isSupabaseConfigured()
      ? sb().from("articles").select("title, slug, content_kind").eq("status", "PUBLISHED").ilike("title", `%${q.replace(/[%_]/g, " ")}%`).limit(6)
      : Promise.resolve({ data: [] as { title: string; slug: string; content_kind?: string }[] }),
    isSupabaseConfigured()
      ? sb().from("search_boosts").select("query, target_type, target_slug").ilike("query", q)
      : Promise.resolve({ data: [] as { query: string; target_type: string; target_slug: string }[] }),
    isSupabaseConfigured()
      ? sb().from("search_promotions").select("query, product_id, sort_order").ilike("query", q).order("sort_order").limit(4)
      : Promise.resolve({ data: [] as { query: string; product_id: string; sort_order: number }[] }),
  ]);
  const articleRows = articles ?? [];
  const promoted = await Promise.all((promotions ?? []).map((row) => getPublishedProductById(row.product_id, locale)));
  const promotedHits = promoted
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ name: item.name, slug: item.slug, href: `/produs/${item.slug}` }));
  const productHits = [
    ...promotedHits,
    ...items
      .filter((item) => !promotedHits.some((hit) => hit.slug === item.slug))
      .map((item) => ({ name: item.name, slug: item.slug, href: `/produs/${item.slug}` })),
  ].slice(0, 8);
  return {
    products: productHits,
    categories: (categories ?? []).map((row) => ({ name: row.name, slug: row.slug, href: `/categorie/${row.slug}` })),
    collections: (collections ?? []).map((row) => ({ name: row.name, slug: row.slug, href: `/colectie/${row.slug}` })),
    articles: articleRows
      .filter((row) => row.content_kind !== "GUIDE")
      .map((row) => ({ name: row.title, slug: row.slug, href: `/blog/${row.slug}` })),
    guides: articleRows
      .filter((row) => row.content_kind === "GUIDE")
      .map((row) => ({ name: row.title, slug: row.slug, href: `/ghiduri/${row.slug}` })),
    boosts: (boosts ?? []).map((row) => ({
      name: row.target_slug,
      href: row.target_type === "collection" ? `/colectie/${row.target_slug}` : row.target_type === "category" ? `/categorie/${row.target_slug}` : `/produs/${row.target_slug}`,
    })),
  };
}
