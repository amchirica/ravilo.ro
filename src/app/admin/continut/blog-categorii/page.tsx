import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { slugify } from "@/lib/slug";

type Cat = { id: string; name: string; slug: string; description: string; isActive?: boolean; sortOrder?: number };

async function saveCategory(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: slugify(String(formData.get("slug") ?? formData.get("name") ?? "")),
    description: String(formData.get("description") ?? ""),
    meta_title: String(formData.get("metaTitle") ?? ""),
    meta_description: String(formData.get("metaDescription") ?? ""),
    is_active: formData.get("isActive") === "on",
    sort_order: Number(formData.get("sortOrder") ?? 0),
    updated_at: new Date().toISOString(),
  };
  if (id) await sb().from("article_categories").update(payload).eq("id", id);
  else await sb().from("article_categories").insert(payload);
  revalidatePath("/blog");
  revalidatePath("/admin/continut/blog-categorii");
}

export default async function BlogCategoriesAdmin() {
  await requirePermission("content.write");
  const rows = await listRows<Cat>("article_categories", { order: "sort_order" });
  return (
    <div>
      <AdminHeading k="blogCategories" />
      <form action={saveCategory} className="mt-8 grid max-w-xl gap-3 border border-line p-5">
        <Field label="Nume">
          <Input name="name" required />
        </Field>
        <Field label="Slug">
          <Input name="slug" />
        </Field>
        <Field label="Descriere">
          <Input name="description" />
        </Field>
        <Field label="Meta title">
          <Input name="metaTitle" />
        </Field>
        <Field label="Meta description">
          <Input name="metaDescription" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked /> Activă
        </label>
        <Button type="submit">Adaugă</Button>
      </form>
      <ul className="mt-8 space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            {row.name} · /blog/categorie/{row.slug}
          </li>
        ))}
      </ul>
    </div>
  );
}
