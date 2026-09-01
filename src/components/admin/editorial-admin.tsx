import { requirePermission } from "@/server/auth/session";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Button, Field, Input, Select } from "@/components/ui/primitives";
import { CmsEditor } from "@/components/admin/cms-editor";
import { AdminImageField } from "@/components/admin/image-field";
import { sanitizeCmsHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { resolveFormImage } from "@/services/storage";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ConfirmForm } from "@/components/admin/confirm-form";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  contentKind?: string;
  excerpt: string;
  content: string;
  category: string;
  coverUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
};

type ProductOption = { id: string; name: string; slug: string };
type ShopLink = { href: string; label: string; group: string };

const SHOP_LINKS: ShopLink[] = [
  { href: "/produse", label: "Toate produsele", group: "Magazin" },
  { href: "/noutati", label: "Noutăți", group: "Magazin" },
  { href: "/best-sellers", label: "Best sellers", group: "Magazin" },
  { href: "/pachete", label: "Pachete", group: "Magazin" },
  { href: "/categorii", label: "Categorii", group: "Magazin" },
  { href: "/colectii", label: "Colecții", group: "Magazin" },
];

async function saveArticle(kind: "ARTICLE" | "GUIDE", formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "DRAFT");
  const { data: existing } = id
    ? await sb().from("articles").select("cover_url").eq("id", id).maybeSingle()
    : { data: null };
  const coverUrl = await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: kind === "GUIDE" ? "guides" : "journal",
    current: typeof existing?.cover_url === "string" ? existing.cover_url : null,
  });
  const payload = {
    title: String(formData.get("title") ?? ""),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: sanitizeCmsHtml(String(formData.get("content") ?? "")),
    category: String(formData.get("category") ?? (kind === "GUIDE" ? "Ghid" : "Blog")),
    status,
    content_kind: kind,
    cover_url: coverUrl,
    cta_label: String(formData.get("ctaLabel") ?? "").trim(),
    cta_url: String(formData.get("ctaUrl") ?? "").trim(),
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    updated_by: actor.id,
  };
  let articleId = id;
  if (id) {
    const { error } = await sb().from("articles").update(payload).eq("id", id);
    if (error) {
      const { cover_url, cta_label, cta_url, content_kind, updated_by, ...legacy } = payload;
      void cover_url;
      void cta_label;
      void cta_url;
      void content_kind;
      void updated_by;
      await sb().from("articles").update(legacy).eq("id", id);
    }
  } else {
    const { data, error } = await sb()
      .from("articles")
      .insert({ ...payload, created_by: actor.id, author: "RAVILO" })
      .select("id")
      .single();
    if (error || !data) {
      const { data: created } = await sb()
        .from("articles")
        .insert({
          title: payload.title,
          slug: payload.slug,
          excerpt: payload.excerpt,
          content: payload.content,
          category: payload.category,
          status: payload.status,
          published_at: payload.published_at,
          updated_at: payload.updated_at,
          author: "RAVILO",
        })
        .select("id")
        .single();
      articleId = created?.id ?? "";
    } else {
      articleId = data.id;
    }
  }
  if (articleId) {
    await sb().from("article_products").delete().eq("article_id", articleId);
    const productIds = [...new Set(formData.getAll("productIds").map(String).filter(Boolean))];
    if (productIds.length) {
      await sb().from("article_products").insert(productIds.map((productId) => ({ article_id: articleId, product_id: productId })));
    }
  }
  await writeAudit({ actorUserId: actor.id, action: "article.save", entityType: "Article", entityId: articleId || payload.slug, after: payload });
  revalidatePath("/blog");
  revalidatePath("/ghiduri");
  revalidatePath("/en/blog");
  revalidatePath("/en/ghiduri");
  revalidatePath("/");
  revalidatePath("/admin/continut/blog");
  revalidatePath("/admin/continut/ghiduri");
  const path = kind === "GUIDE" ? `/ghiduri/${payload.slug}` : `/blog/${payload.slug}`;
  revalidatePath(path);
  revalidatePath(`/en${path}`);
}

async function deleteArticle(id: string) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("articles").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "article.delete", entityType: "Article", entityId: id });
  revalidatePath("/blog");
  revalidatePath("/ghiduri");
}

export async function EditorialAdmin({ kind }: { kind: "ARTICLE" | "GUIDE" }) {
  await requirePermission("content.write");
  const t = await getTranslations("admin");
  const rows = await listRows<ArticleRow>("articles", { order: "updated_at", ascending: false });
  const items = rows.filter((row) => (row.contentKind === "GUIDE" ? "GUIDE" : "ARTICLE") === kind);
  const products: ProductOption[] = [];
  const shopLinks: ShopLink[] = [...SHOP_LINKS];
  if (isSupabaseConfigured()) {
    const [{ data: productRows }, { data: categoryRows }, { data: collectionRows }] = await Promise.all([
      sb().from("products").select("id, name, slug").eq("status", "ACTIVE").eq("is_active", true).order("name").limit(300),
      sb().from("categories").select("name, slug").eq("is_active", true).order("name").limit(200),
      sb().from("collections").select("name, slug").eq("is_active", true).order("name").limit(200),
    ]);
    for (const product of productRows ?? []) {
      products.push({ id: String(product.id), name: String(product.name), slug: String(product.slug ?? "") });
      if (product.slug) shopLinks.push({ href: `/produs/${product.slug}`, label: String(product.name), group: "Produse" });
    }
    for (const category of categoryRows ?? []) {
      if (category.slug) shopLinks.push({ href: `/categorie/${category.slug}`, label: String(category.name), group: "Categorii" });
    }
    for (const collection of collectionRows ?? []) {
      if (collection.slug) shopLinks.push({ href: `/colectie/${collection.slug}`, label: String(collection.name), group: "Colecții" });
    }
  }
  const { data: links } = isSupabaseConfigured()
    ? await sb().from("article_products").select("article_id, product_id")
    : { data: [] as { article_id: string; product_id: string }[] };
  const selected = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = selected.get(link.article_id as string) ?? [];
    list.push(link.product_id as string);
    selected.set(link.article_id as string, list);
  }
  const title = kind === "GUIDE" ? t("guides") : t("blog");
  return (
    <div>
      <h1 className="font-serif text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
        Imaginea stă în dreapta pe desktop și sub titlu pe telefon. Adaugă un link către categorie, colecție sau produs, plus produsele afișate jos în articol.
      </p>
      <ArticleForm kind={kind} products={products} shopLinks={shopLinks} selected={[]} saveLabel={t("save")} />
      <ul className="mt-10 space-y-4">
        {items.map((article) => (
          <li key={article.id} className="border border-line p-4">
            <p className="font-medium">
              {article.title} · {article.status}
            </p>
            <p className="text-sm text-mute">
              /{kind === "GUIDE" ? "ghiduri" : "blog"}/{article.slug}
            </p>
            <ArticleForm kind={kind} article={article} products={products} shopLinks={shopLinks} selected={selected.get(article.id) ?? []} saveLabel={t("update")} />
            <ConfirmForm action={deleteArticle.bind(null, article.id)} message="Ștergi articolul definitiv?">
              <button className="text-sm text-danger underline">{t("delete")}</button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArticleForm({
  kind,
  article,
  products,
  shopLinks,
  selected,
  saveLabel,
}: {
  kind: "ARTICLE" | "GUIDE";
  article?: ArticleRow;
  products: ProductOption[];
  shopLinks: ShopLink[];
  selected: string[];
  saveLabel: string;
}) {
  const chosen = new Set(selected);
  const preview = article ? (kind === "GUIDE" ? `/ghiduri/${article.slug}` : `/blog/${article.slug}`) : null;
  const knownHrefs = new Set(shopLinks.map((link) => link.href));
  const currentCta = article?.ctaUrl?.trim() ?? "";
  const groups = [...new Set(shopLinks.map((link) => link.group))];
  return (
    <form action={saveArticle.bind(null, kind)} className={article ? "mt-4 grid gap-3" : "mt-8 grid gap-4 border border-line bg-card p-5"} encType="multipart/form-data">
      {article ? <input type="hidden" name="id" value={article.id} /> : <h2 className="font-serif text-2xl">Articol nou</h2>}
      <Field label="Titlu">
        <Input name="title" defaultValue={article?.title ?? ""} required />
      </Field>
      <Field label="Slug">
        <Input name="slug" defaultValue={article?.slug ?? ""} />
      </Field>
      <Field label="Categorie">
        <Input name="category" defaultValue={article?.category ?? (kind === "GUIDE" ? "Ghid" : "Blog")} />
      </Field>
      <Field label="Introducere (sub titlu, lângă imagine)">
        <Input name="excerpt" defaultValue={article?.excerpt ?? ""} />
      </Field>
      <AdminImageField label="Imagine (desktop dreapta, telefon sub introducere)" current={article?.coverUrl} />
      <Field label="Text buton către produse">
        <Input name="ctaLabel" defaultValue={article?.ctaLabel ?? ""} placeholder="Vezi produsele" />
      </Field>
      <Field label="Link produse (categoria, colecția sau produsul de vânzare)">
        <Select name="ctaUrl" defaultValue={currentCta}>
          <option value="">Fără buton</option>
          {currentCta && !knownHrefs.has(currentCta) ? <option value={currentCta}>{currentCta}</option> : null}
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {shopLinks
                .filter((link) => link.group === group)
                .map((link) => (
                  <option key={link.href} value={link.href}>
                    {link.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="text-[0.8125rem] text-mute">Produse afișate jos în articol</legend>
        <ul className="max-h-48 space-y-1 overflow-auto border border-line p-2">
          {products.map((product) => (
            <li key={product.id}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="productIds" value={product.id} defaultChecked={chosen.has(product.id)} />
                {product.name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <Field label="Status">
        <Select name="status" defaultValue={article?.status ?? "DRAFT"}>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Publicat</option>
          <option value="ARCHIVED">Arhivat</option>
        </Select>
      </Field>
      <CmsEditor name="content" defaultValue={article?.content} label="Textul articolului (sub imagine; nu pune coperta aici)" />
      <div className="flex gap-4">
        <Button type="submit">{saveLabel}</Button>
        {preview ? (
          <Link href={preview} className="text-sm underline">
            Preview
          </Link>
        ) : null}
      </div>
    </form>
  );
}
