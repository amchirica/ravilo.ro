import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { CmsEditor } from "@/components/admin/cms-editor";
import { sanitizeCmsHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";

type PageRow = { id: string; slug: string; title: string; status: string; content: string };

async function savePage(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "DRAFT");
  const payload = {
    title: String(formData.get("title") ?? ""),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    content: sanitizeCmsHtml(String(formData.get("content") ?? "")),
    status,
    seo_title: String(formData.get("seoTitle") ?? ""),
    seo_description: String(formData.get("seoDescription") ?? ""),
    template: String(formData.get("template") ?? "default"),
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (id) await sb().from("pages").update(payload).eq("id", id);
  else await sb().from("pages").insert(payload);
  revalidatePath("/");
  revalidatePath("/admin/continut/pagini");
}

export default async function PagesAdmin() {
  await requirePermission("content.write");
  const rows = await listRows<PageRow>("pages", { order: "slug" });
  return (
    <div>
      <AdminHeading k="pages" />
      <form action={savePage} className="mt-8 grid max-w-3xl gap-3 border border-line p-5">
        <Field label="Titlu">
          <Input name="title" required />
        </Field>
        <Field label="Slug">
          <Input name="slug" placeholder="despre" />
        </Field>
        <select name="status" className="border border-line bg-paper px-3 py-2">
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Publicat</option>
        </select>
        <CmsEditor name="content" label="Conținut" />
        <Button type="submit">Salvează pagina</Button>
      </form>
      <ul className="mt-8 space-y-4">
        {rows.map((page) => (
          <li key={page.id} className="border border-line p-4">
            /{page.slug} · {page.title} · {page.status}
            <form action={savePage} className="mt-3 grid gap-2">
              <input type="hidden" name="id" value={page.id} />
              <Input name="title" defaultValue={page.title} />
              <Input name="slug" defaultValue={page.slug} />
              <select name="status" defaultValue={page.status} className="border border-line bg-paper px-3 py-2">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Publicat</option>
                <option value="ARCHIVED">Arhivat</option>
              </select>
              <CmsEditor name="content" defaultValue={page.content} label="Conținut" />
              <Button type="submit">Actualizează</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
