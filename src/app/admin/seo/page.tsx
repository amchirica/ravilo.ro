import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import Link from "next/link";

type ProductSeo = { id: string; name: string; slug: string; seoTitle: string | null; seoDescription: string | null; canonicalUrl: string | null; status: string };
type CategorySeo = { id: string; name: string; slug: string; seoTitle: string | null; seoDescription: string | null };

type CollectionSeo = { id: string; name: string; slug: string; seoTitle: string | null; canonicalUrl: string | null };
type ArticleSeo = { id: string; title: string; slug: string; seoTitle: string | null; contentKind?: string };
type PageSeo = { id: string; title: string; slug: string; seoTitle: string | null };

export default async function SeoAdmin() {
  await requirePermission("content.read");
  const { data: products } = await sb()
    .from("products")
    .select("id, name, slug, seo_title, seo_description, canonical_url, status")
    .order("updated_at", { ascending: false })
    .limit(80);
  const { data: categories } = await sb().from("categories").select("id, name, slug, seo_title, seo_description").order("sort_order");
  const collectionsRes = await sb().from("collections").select("id, name, slug, seo_title, canonical_url").eq("is_active", true);
  const collections = collectionsRes.error
    ? (await sb().from("collections").select("id, name, slug, seo_title").eq("is_active", true)).data
    : collectionsRes.data;
  const articlesRes = await sb().from("articles").select("id, title, slug, seo_title, content_kind").eq("status", "PUBLISHED").limit(80);
  const articles = articlesRes.error
    ? (await sb().from("articles").select("id, title, slug, seo_title").eq("status", "PUBLISHED").limit(80)).data
    : articlesRes.data;
  const { data: pages } = await sb().from("pages").select("id, title, slug, seo_title").eq("status", "PUBLISHED").limit(80);
  const productRows = camelList<ProductSeo>(products);
  const categoryRows = camelList<CategorySeo>(categories);
  const collectionRows = camelList<CollectionSeo>(collections);
  const articleRows = camelList<ArticleSeo>(articles);
  const pageRows = camelList<PageSeo>(pages);
  return (
    <div>
      <AdminHeading k="seo" />
      <p className="mt-2 text-sm text-mute">Meta, slug și canonical se editează pe produs/categorie. Produsele inactive nu sunt indexate.</p>
      <h2 className="mt-10 font-serif text-2xl">Produse</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Nume</th>
            <th>Slug</th>
            <th>Title</th>
            <th>Canonical</th>
          </tr>
        </thead>
        <tbody>
          {productRows.map((product) => (
            <tr key={product.id} className="border-t border-line">
              <td className="py-2">
                <Link href={`/admin/produse/${product.id}`} className="underline">
                  {product.name}
                </Link>
              </td>
              <td>/produs/{product.slug}</td>
              <td>{product.seoTitle || <span className="text-warning">lipsă</span>}</td>
              <td>{product.canonicalUrl || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-12 font-serif text-2xl">Categorii</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Nume</th>
            <th>Slug</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {categoryRows.map((category) => (
            <tr key={category.id} className="border-t border-line">
              <td className="py-2">
                <Link href="/admin/categorii" className="underline">
                  {category.name}
                </Link>
              </td>
              <td>/categorie/{category.slug}</td>
              <td>{category.seoTitle || <span className="text-warning">lipsă</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <SeoTable
        title="Colecții"
        rows={collectionRows.map((row) => ({
          id: row.id,
          name: row.name,
          path: `/colectie/${row.slug}`,
          title: row.seoTitle,
          href: "/admin/colectii",
        }))}
      />
      <SeoTable
        title="Jurnal / ghiduri"
        rows={articleRows.map((row) => ({
          id: row.id,
          name: row.title,
          path: row.contentKind === "GUIDE" ? `/ghiduri/${row.slug}` : `/blog/${row.slug}`,
          title: row.seoTitle,
          href: row.contentKind === "GUIDE" ? "/admin/continut/ghiduri" : "/admin/continut/blog",
        }))}
      />
      <SeoTable
        title="Pagini"
        rows={pageRows.map((row) => ({
          id: row.id,
          name: row.title,
          path: `/${row.slug}`,
          title: row.seoTitle,
          href: "/admin/continut/pagini",
        }))}
      />
    </div>
  );
}

function SeoTable({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; path: string; title: string | null; href: string }[];
}) {
  return (
    <>
      <h2 className="mt-12 font-serif text-2xl">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-mute">Nimic publicat încă.</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-mute">
              <th className="py-2">Nume</th>
              <th>URL</th>
              <th>Title</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="py-2">
                  <Link href={row.href} className="underline">
                    {row.name}
                  </Link>
                </td>
                <td>{row.path}</td>
                <td>{row.title || <span className="text-warning">lipsă</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
