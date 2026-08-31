import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { slugify } from "@/lib/slug";
import { z } from "zod";

type CollectionRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  imagePath: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  editorialHtml: string;
};

const schema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  imagePath: z.string().max(400).optional(),
  seoTitle: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  canonicalUrl: z.string().max(300).optional(),
  editorialHtml: z.string().max(20000).optional(),
  sortOrder: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export default async function CollectionsAdmin() {
  await requirePermission("product.write");
  const rows = camelList<CollectionRow>((await sb().from("collections").select("*").order("sort_order", { ascending: true })).data);
  const { data: products } = await sb().from("products").select("id, name, slug").eq("status", "ACTIVE").order("name").limit(200);
  const { data: links } = await sb().from("collection_products").select("collection_id, product_id, sort_order");
  const byCollection = new Map<string, string[]>();
  for (const link of links ?? []) {
    const list = byCollection.get(link.collection_id as string) ?? [];
    list.push(link.product_id as string);
    byCollection.set(link.collection_id as string, list);
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <AdminHeading k="collections" />
        <ul className="mt-6 space-y-6">
          {rows.map((collection) => (
            <li key={collection.id} className="border border-line bg-card p-4">
              <form action={saveCollection.bind(null, collection.id)} className="grid gap-3">
                <p className="text-xs uppercase tracking-[0.16em] text-mute">/colectie/{collection.slug}</p>
                <Field label="Nume">
                  <Input name="name" defaultValue={collection.name} required />
                </Field>
                <Field label="Slug">
                  <Input name="slug" defaultValue={collection.slug} />
                </Field>
                <Field label="Descriere">
                  <Textarea name="description" defaultValue={collection.description} />
                </Field>
                <Field label="Imagine (URL)">
                  <Input name="imagePath" defaultValue={collection.imagePath ?? ""} />
                </Field>
                <Field label="SEO title">
                  <Input name="seoTitle" defaultValue={collection.seoTitle ?? ""} />
                </Field>
                <Field label="SEO description">
                  <Textarea name="seoDescription" defaultValue={collection.seoDescription ?? ""} />
                </Field>
                <Field label="Canonical">
                  <Input name="canonicalUrl" defaultValue={collection.canonicalUrl ?? ""} />
                </Field>
                <Field label="Bloc editorial (HTML sanitizat)">
                  <Textarea name="editorialHtml" defaultValue={collection.editorialHtml} rows={4} />
                </Field>
                <Field label="Ordine">
                  <Input name="sortOrder" defaultValue={String(collection.sortOrder ?? 0)} />
                </Field>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={collection.isActive} /> Activă
                </label>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" name="isFeatured" defaultChecked={collection.isFeatured} /> Featured
                </label>
                <Button type="submit" variant="line">
                  Salvează
                </Button>
              </form>
              <form action={addProduct.bind(null, collection.id)} className="mt-4 flex gap-2">
                <select name="productId" className="flex-1 rounded-md border border-line px-3 py-2 text-sm">
                  {(products ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="line">
                  Adaugă produs
                </Button>
              </form>
              <ul className="mt-3 text-sm text-mute">
                {(byCollection.get(collection.id) ?? []).map((productId) => {
                  const product = (products ?? []).find((row) => row.id === productId);
                  return (
                    <li key={productId} className="flex justify-between gap-2">
                      <span>{product?.name ?? productId}</span>
                      <form action={removeProduct.bind(null, collection.id, productId)}>
                        <button className="text-xs underline">Scoate</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
              <form action={deleteCollection.bind(null, collection.id)} className="mt-3">
                <button className="text-xs text-mute underline">Arhivează / șterge</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="font-serif text-2xl">Colecție nouă</h2>
        <form action={createCollection} className="mt-4 grid gap-3">
          <Field label="Nume">
            <Input name="name" required />
          </Field>
          <Field label="Slug">
            <Input name="slug" />
          </Field>
          <Field label="Descriere">
            <Textarea name="description" />
          </Field>
          <Button type="submit">Creează</Button>
        </form>
      </div>
    </div>
  );
}

function parseCollection(formData: FormData) {
  return schema.parse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    imagePath: String(formData.get("imagePath") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
    editorialHtml: String(formData.get("editorialHtml") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
}

function revalidateCollections() {
  revalidatePath("/colectii");
  revalidatePath("/colectie");
  revalidatePath("/");
  revalidatePath("/admin/colectii");
}

async function createCollection(formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const parsed = parseCollection(formData);
  const { data, error } = await sb()
    .from("collections")
    .insert({
      name: parsed.name,
      slug: slugify(parsed.slug || parsed.name),
      description: parsed.description ?? "",
      is_active: true,
      type: "manual",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Nu am putut crea colecția.");
  await writeAudit({ actorUserId: actor.id, action: "collection.create", entityType: "Collection", entityId: data.id, after: { name: parsed.name } });
  revalidateCollections();
}

async function saveCollection(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const parsed = parseCollection(formData);
  const payload: Record<string, unknown> = {
    name: parsed.name,
    slug: slugify(parsed.slug || parsed.name),
    description: parsed.description ?? "",
    seo_title: parsed.seoTitle || null,
    seo_description: parsed.seoDescription || null,
    is_active: parsed.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
  if (parsed.imagePath !== undefined) payload.image_path = parsed.imagePath || null;
  if (parsed.canonicalUrl !== undefined) payload.canonical_url = parsed.canonicalUrl || null;
  if (parsed.editorialHtml !== undefined) payload.editorial_html = parsed.editorialHtml ?? "";
  if (parsed.sortOrder !== undefined) payload.sort_order = Number(parsed.sortOrder ?? 0) || 0;
  payload.is_featured = parsed.isFeatured ?? false;
  const { error } = await sb().from("collections").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "collection.update", entityType: "Collection", entityId: id, after: { name: parsed.name } });
  revalidateCollections();
}

async function addProduct(collectionId: string, formData: FormData) {
  "use server";
  await requirePermission("product.write");
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return;
  await sb().from("collection_products").upsert({ collection_id: collectionId, product_id: productId, sort_order: 0 });
  revalidateCollections();
}

async function removeProduct(collectionId: string, productId: string) {
  "use server";
  await requirePermission("product.write");
  await sb().from("collection_products").delete().eq("collection_id", collectionId).eq("product_id", productId);
  revalidateCollections();
}

async function deleteCollection(id: string) {
  "use server";
  const actor = await requirePermission("product.write");
  await sb().from("collections").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "collection.archive", entityType: "Collection", entityId: id });
  revalidateCollections();
}
