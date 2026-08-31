import { requirePermission } from "@/server/auth/session";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { CmsEditor } from "@/components/admin/cms-editor";
import { sanitizeCmsHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  contentKind?: string;
  excerpt: string;
  content: string;
  category: string;
};

async function saveArticle(kind: "ARTICLE" | "GUIDE", formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "DRAFT");
  const payload = {
    title: String(formData.get("title") ?? ""),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: sanitizeCmsHtml(String(formData.get("content") ?? "")),
    category: String(formData.get("category") ?? (kind === "GUIDE" ? "Ghid" : "Blog")),
    status,
    content_kind: kind,
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    updated_by: actor.id,
  };
  if (id) {
    const { error } = await sb().from("articles").update(payload).eq("id", id);
    if (error) {
      await sb()
        .from("articles")
        .update({
          title: payload.title,
          slug: payload.slug,
          excerpt: payload.excerpt,
          content: payload.content,
          category: payload.category,
          status: payload.status,
          published_at: payload.published_at,
          updated_at: payload.updated_at,
        })
        .eq("id", id);
    }
  } else {
    const { error } = await sb().from("articles").insert({ ...payload, created_by: actor.id, author: "RAVILO" });
    if (error) {
      await sb().from("articles").insert({
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt,
        content: payload.content,
        category: payload.category,
        status: payload.status,
        published_at: payload.published_at,
        updated_at: payload.updated_at,
        author: "RAVILO",
      });
    }
  }
  await writeAudit({ actorUserId: actor.id, action: "article.save", entityType: "Article", entityId: id || payload.slug, after: payload });
  revalidatePath("/blog");
  revalidatePath("/ghiduri");
  revalidatePath("/");
  revalidatePath("/admin/continut/blog");
  revalidatePath("/admin/continut/ghiduri");
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
  const title = kind === "GUIDE" ? t("guides") : t("blog");
  return (
    <div>
      <h1 className="font-serif text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-mute">Draft, publicare, programare prin status. HTML-ul este sanitizat la salvare.</p>
      <form action={saveArticle.bind(null, kind)} className="mt-8 grid gap-4 border border-line bg-card p-5">
        <h2 className="font-serif text-2xl">Articol nou</h2>
        <Field label="Titlu">
          <Input name="title" required />
        </Field>
        <Field label="Slug">
          <Input name="slug" />
        </Field>
        <Field label="Categorie">
          <Input name="category" defaultValue={kind === "GUIDE" ? "Ghid" : "Blog"} />
        </Field>
        <Field label="Excerpt">
          <Input name="excerpt" />
        </Field>
        <Field label="Status">
          <select name="status" className="w-full border border-line bg-paper px-3 py-2">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Publicat</option>
            <option value="SCHEDULED">Programat</option>
            <option value="ARCHIVED">Arhivat</option>
          </select>
        </Field>
        <CmsEditor name="content" label={t("content")} />
        <Button type="submit">{t("save")}</Button>
      </form>
      <ul className="mt-10 space-y-4">
        {items.map((article) => (
          <li key={article.id} className="border border-line p-4">
            <p className="font-medium">
              {article.title} · {article.status}
            </p>
            <p className="text-sm text-mute">/{kind === "GUIDE" ? "ghiduri" : "blog"}/{article.slug}</p>
            <form action={saveArticle.bind(null, kind)} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={article.id} />
              <Field label="Titlu">
                <Input name="title" defaultValue={article.title} />
              </Field>
              <Field label="Slug">
                <Input name="slug" defaultValue={article.slug} />
              </Field>
              <Field label="Excerpt">
                <Input name="excerpt" defaultValue={article.excerpt} />
              </Field>
              <Field label="Categorie">
                <Input name="category" defaultValue={article.category} />
              </Field>
              <select name="status" defaultValue={article.status} className="border border-line bg-paper px-3 py-2">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Publicat</option>
                <option value="ARCHIVED">Arhivat</option>
              </select>
              <CmsEditor name="content" defaultValue={article.content} label={t("content")} />
              <div className="flex gap-4">
                <Button type="submit">{t("update")}</Button>
                <Link href={kind === "GUIDE" ? `/ghiduri/${article.slug}` : `/blog/${article.slug}`} className="text-sm underline">
                  Preview
                </Link>
              </div>
            </form>
            <form action={deleteArticle.bind(null, article.id)} className="mt-3">
              <button className="text-sm text-danger underline">{t("delete")}</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
