import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { revalidatePath } from "next/cache";
import { Button, Field, Input } from "@/components/ui/primitives";
import { slugify } from "@/lib/slug";
import { ConfirmForm } from "@/components/admin/confirm-form";

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

async function deleteCategory(id: string) {
  "use server";
  await requirePermission("content.write");
  if (!isSupabaseConfigured()) return;
  await sb().from("article_categories").delete().eq("id", id);
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
      <ul className="mt-8 space-y-4">
        {rows.map((row) => (
          <li key={row.id} className="border border-line p-4">
            <form action={saveCategory} className="grid max-w-xl gap-3">
              <input type="hidden" name="id" value={row.id} />
              <Field label="Nume">
                <Input name="name" required defaultValue={row.name} />
              </Field>
              <Field label="Slug">
                <Input name="slug" defaultValue={row.slug} />
              </Field>
              <Field label="Descriere">
                <Input name="description" defaultValue={row.description} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={row.isActive !== false} /> Activă
              </label>
              <Field label="Ordine">
                <Input name="sortOrder" defaultValue={String(row.sortOrder ?? 0)} />
              </Field>
              <Button type="submit" variant="line">
                Salvează
              </Button>
            </form>
            <ConfirmForm action={deleteCategory.bind(null, row.id)} message="Ștergi categoria de jurnal?">
              <button className="mt-3 text-xs text-danger underline">Șterge</button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
