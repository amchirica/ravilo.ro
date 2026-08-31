import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { STOREFRONT_CACHE, revalidateStorefrontTag } from "@/lib/storefront-cache";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { slugify } from "@/lib/slug";
import { z } from "zod";
import { resolveFormImage } from "@/services/storage";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  heroImage: string | null;
};

const schema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  parentId: z.string().uuid().optional(),
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  sortOrder: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export default async function CategoriesAdmin() {
  await requirePermission("product.write");
  const rows = camelList<CategoryRow>(
    (await sb().from("categories").select("*").order("sort_order", { ascending: true })).data,
  );
  const byId = new Map(rows.map((row) => [row.id, row]));
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <AdminHeading k="categories" />
        <ul className="mt-6 space-y-3">
          {rows.map((category) => (
            <li key={category.id} className="border border-line bg-card p-4">
              <form action={saveCategory.bind(null, category.id)} className="grid gap-3" encType="multipart/form-data">
                <p className="text-xs uppercase tracking-[0.16em] text-mute">
                  {category.parentId ? `Sub: ${byId.get(category.parentId)?.name ?? "—"}` : "Categorie"} · /categorie/{category.slug}
                </p>
                <Field label="Nume">
                  <Input name="name" defaultValue={category.name} required />
                </Field>
                <Field label="Slug">
                  <Input name="slug" defaultValue={category.slug} />
                </Field>
                <Field label="Descriere">
                  <Textarea name="description" defaultValue={category.description} />
                </Field>
                <AdminImageField
                  label="Imagine de referință"
                  current={category.heroImage}
                  square
                  hint="Pătrat. JPEG, PNG, WebP sau AVIF. Max 8 MB. Se taie central dacă poza nu e pătrată."
                />
                <Field label="Părinte">
                  <select name="parentId" defaultValue={category.parentId ?? ""} className="w-full rounded-md border border-line px-3 py-2">
                    <option value="">— rădăcină</option>
                    {rows
                      .filter((row) => row.id !== category.id)
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="SEO title">
                  <Input name="seoTitle" defaultValue={category.seoTitle ?? ""} />
                </Field>
                <Field label="SEO description">
                  <Textarea name="seoDescription" defaultValue={category.seoDescription ?? ""} />
                </Field>
                <Field label="Ordine">
                  <Input name="sortOrder" defaultValue={String(category.sortOrder)} />
                </Field>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={category.isActive} /> Activă
                </label>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isFeatured" defaultChecked={category.isFeatured} /> Featured
                </label>
                <div className="flex gap-3">
                  <Button type="submit" variant="line">
                    Salvează
                  </Button>
                </div>
              </form>
              <form action={deleteCategory.bind(null, category.id)} className="mt-2">
                <button className="text-xs text-mute underline">Șterge</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-serif text-2xl">Categorie nouă</h2>
        <form action={createCategory} className="mt-4 grid gap-3" encType="multipart/form-data">
          <Field label="Nume">
            <Input name="name" required />
          </Field>
          <Field label="Slug">
            <Input name="slug" />
          </Field>
          <Field label="Descriere">
            <Textarea name="description" />
          </Field>
          <AdminImageField label="Imagine de referință" square hint="Pătrat. JPEG, PNG, WebP sau AVIF. Max 8 MB." />
          <Field label="Părinte">
            <select name="parentId" className="w-full rounded-md border border-line px-3 py-2">
              <option value="">— rădăcină</option>
              {rows.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked /> Activă
          </label>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" name="isFeatured" /> Featured
          </label>
          <Button type="submit">Creează</Button>
        </form>
      </div>
    </div>
  );
}

function parseCategory(formData: FormData) {
  return schema.parse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    parentId: String(formData.get("parentId") ?? "") || undefined,
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

async function createCategory(formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const parsed = parseCategory(formData);
  const heroImage = await resolveFormImage(formData, { createdBy: actor.id, folder: "categories" });
  const { data, error } = await sb()
    .from("categories")
    .insert({
      name: parsed.name,
      slug: slugify(parsed.slug || parsed.name),
      description: parsed.description ?? "",
      parent_id: parsed.parentId ?? null,
      seo_title: parsed.seoTitle || null,
      seo_description: parsed.seoDescription || null,
      hero_image: heroImage,
      sort_order: Number(parsed.sortOrder ?? 0) || 0,
      is_active: parsed.isActive ?? true,
      is_featured: parsed.isFeatured ?? false,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Nu am putut crea categoria.");
  await writeAudit({ actorUserId: actor.id, action: "category.create", entityType: "Category", entityId: data.id, after: { name: parsed.name } });
  revalidatePath("/categorii");
  revalidatePath("/");
  revalidatePath("/admin/categorii");
  revalidateStorefrontTag(STOREFRONT_CACHE.categories);
}

async function saveCategory(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const parsed = parseCategory(formData);
  const heroImage = await resolveFormImage(formData, { createdBy: actor.id, folder: "categories" });
  const { error } = await sb()
    .from("categories")
    .update({
      name: parsed.name,
      slug: slugify(parsed.slug || parsed.name),
      description: parsed.description ?? "",
      parent_id: parsed.parentId ?? null,
      seo_title: parsed.seoTitle || null,
      seo_description: parsed.seoDescription || null,
      hero_image: heroImage,
      sort_order: Number(parsed.sortOrder ?? 0) || 0,
      is_active: parsed.isActive ?? true,
      is_featured: parsed.isFeatured ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "category.update", entityType: "Category", entityId: id, after: { name: parsed.name } });
  revalidatePath("/categorii");
  revalidatePath("/");
  revalidatePath("/admin/categorii");
  revalidateStorefrontTag(STOREFRONT_CACHE.categories);
}

async function deleteCategory(id: string) {
  "use server";
  const actor = await requirePermission("product.write");
  await sb().from("products").update({ category_id: null }).eq("category_id", id);
  await sb().from("categories").update({ parent_id: null }).eq("parent_id", id);
  const { error } = await sb().from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "category.delete", entityType: "Category", entityId: id });
  revalidatePath("/categorii");
  revalidatePath("/");
  revalidatePath("/admin/categorii");
  revalidateStorefrontTag(STOREFRONT_CACHE.categories);
}
