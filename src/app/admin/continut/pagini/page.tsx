import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { CmsEditor } from "@/components/admin/cms-editor";
import { AdminImageField } from "@/components/admin/image-field";
import { sanitizeCmsHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { resolveFormImage } from "@/services/storage";
import Link from "next/link";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  content: string;
  excerpt?: string | null;
  coverUrl?: string | null;
};

async function savePage(formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "DRAFT");
  const { data: existing } = id ? await sb().from("pages").select("cover_url").eq("id", id).maybeSingle() : { data: null };
  const coverUrl = await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "pages",
    current: typeof existing?.cover_url === "string" ? existing.cover_url : null,
  });
  const payload = {
    title: String(formData.get("title") ?? ""),
    slug: slugify(String(formData.get("slug") ?? formData.get("title") ?? "")),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: sanitizeCmsHtml(String(formData.get("content") ?? "")),
    status,
    cover_url: coverUrl,
    seo_title: String(formData.get("seoTitle") ?? ""),
    seo_description: String(formData.get("seoDescription") ?? ""),
    template: String(formData.get("template") ?? "default"),
    published_at: status === "PUBLISHED" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (id) {
    const { error } = await sb().from("pages").update(payload).eq("id", id);
    if (error) {
      const { cover_url, excerpt, ...legacy } = payload;
      void cover_url;
      void excerpt;
      await sb().from("pages").update(legacy).eq("id", id);
    }
  } else {
    const { error } = await sb().from("pages").insert(payload);
    if (error) {
      const { cover_url, excerpt, ...legacy } = payload;
      void cover_url;
      void excerpt;
      await sb().from("pages").insert(legacy);
    }
  }
  revalidatePath("/");
  revalidatePath("/admin/continut/pagini");
  revalidatePath(`/${payload.slug}`);
  revalidatePath(`/en/${payload.slug}`);
}

export default async function PagesAdmin() {
  await requirePermission("content.write");
  const rows = await listRows<PageRow>("pages", { order: "slug" });
  return (
    <div>
      <AdminHeading k="pages" />
      <p className="mt-2 max-w-xl text-sm text-mute">
        Termeni, retur, livrare, despre. Imaginea apare în dreapta pe desktop și sub titlu pe telefon. Textul de pe pagina de
        acasă se editează din{" "}
        <Link href="/admin/continut/homepage" className="underline underline-offset-4">
          Admin → Pagina de acasă
        </Link>
        .
      </p>
      <PageForm />
      <ul className="mt-8 space-y-4">
        {rows.map((page) => (
          <li key={page.id} className="border border-line p-4">
            /{page.slug} · {page.title} · {page.status}
            <PageForm page={page} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageForm({ page }: { page?: PageRow }) {
  return (
    <form action={savePage} className={page ? "mt-3 grid gap-2" : "mt-8 grid max-w-3xl gap-3 border border-line p-5"} encType="multipart/form-data">
      {page ? <input type="hidden" name="id" value={page.id} /> : null}
      <Field label="Titlu">
        <Input name="title" defaultValue={page?.title ?? ""} required />
      </Field>
      <Field label="Slug">
        <Input name="slug" defaultValue={page?.slug ?? ""} placeholder="despre" />
      </Field>
      <Field label="Introducere (sub titlu, lângă imagine)">
        <Input name="excerpt" defaultValue={page?.excerpt ?? ""} />
      </Field>
      <AdminImageField label="Imagine (desktop dreapta, telefon sub introducere)" current={page?.coverUrl} />
      <select name="status" defaultValue={page?.status ?? "DRAFT"} className="border border-line bg-paper px-3 py-2">
        <option value="DRAFT">Draft</option>
        <option value="PUBLISHED">Publicat</option>
        {page ? <option value="ARCHIVED">Arhivat</option> : null}
      </select>
      <CmsEditor name="content" defaultValue={page?.content} label="Conținut (sub imagine; nu pune coperta aici)" />
      <Button type="submit">{page ? "Actualizează" : "Salvează pagina"}</Button>
    </form>
  );
}
