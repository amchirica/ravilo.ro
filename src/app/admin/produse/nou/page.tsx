import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { listRows, sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { parseRonToBani } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { defaultLocationId, setVariantStock } from "@/services/inventory";
import { revalidatePath } from "next/cache";
import { productConstraintCode, productSaveMessage } from "@/lib/product-save";

const schema = z.object({
  name: z.string().min(2).max(160),
  slug: z.string().max(160).optional(),
  sku: z.string().min(2).max(60),
  shortDescription: z.string().max(300),
  description: z.string().max(8000).optional(),
  salePrice: z.string(),
  compareAtPrice: z.string().optional(),
  costPrice: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  categoryId: z.string().uuid().optional(),
  stockQuantity: z.string().optional(),
  stockTracking: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.string().optional(),
});

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requirePermission("product.write");
  const { e } = await searchParams;
  const categoryRows = await listRows<{ id: string; name: string }>("categories", { order: "name" });
  return (
    <div className="max-w-xl">
      <AdminHeading k="newProduct" />
      {productSaveMessage(e) ? <p className="mt-4 text-sm text-warning">{productSaveMessage(e)}</p> : null}
      <form action={createProduct} className="mt-8 grid gap-4">
        <Field label="Nume">
          <Input name="name" required />
        </Field>
        <Field label="Slug (gol = din nume)">
          <Input name="slug" />
        </Field>
        <Field label="SKU (unic)">
          <Input name="sku" required />
        </Field>
        <Field label="Preț vânzare (RON)">
          <Input name="salePrice" required placeholder="199.99" />
        </Field>
        <Field label="Preț vechi (RON, opțional)">
          <Input name="compareAtPrice" />
        </Field>
        <Field label="Cost intern (RON)">
          <Input name="costPrice" />
        </Field>
        <Field label="Stoc">
          <Input name="stockQuantity" defaultValue="0" />
        </Field>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="stockTracking" defaultChecked /> Urmărește stocul
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="isFeatured" /> Featured
        </label>
        <Field label="Ordine">
          <Input name="sortOrder" defaultValue="0" />
        </Field>
        <Field label="Descriere scurtă">
          <Textarea name="shortDescription" />
        </Field>
        <Field label="Descriere">
          <Textarea name="description" rows={6} />
        </Field>
        <Field label="Categorie">
          <select name="categoryId" className="w-full rounded-md border border-line px-3 py-2">
            <option value="">—</option>
            {categoryRows.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" className="w-full rounded-md border border-line px-3 py-2" defaultValue="DRAFT">
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Activ</option>
            <option value="ARCHIVED">Arhivat</option>
          </select>
        </Field>
        <Button type="submit">Salvează</Button>
      </form>
    </div>
  );
}

async function createProduct(formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: String(formData.get("slug") ?? ""),
    sku: formData.get("sku"),
    shortDescription: formData.get("shortDescription") ?? "",
    description: String(formData.get("description") ?? ""),
    salePrice: formData.get("salePrice"),
    compareAtPrice: String(formData.get("compareAtPrice") ?? "") || undefined,
    costPrice: String(formData.get("costPrice") ?? "") || undefined,
    status: formData.get("status"),
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    stockQuantity: String(formData.get("stockQuantity") ?? "0"),
    stockTracking: formData.get("stockTracking") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    sortOrder: String(formData.get("sortOrder") ?? "0"),
  });
  if (!parsed.success) redirect("/admin/produse/nou?e=validation");
  const values = parsed.data!;
  await defaultLocationId();
  let salePrice = 0;
  try {
    salePrice = parseRonToBani(values.salePrice);
  } catch {
    redirect("/admin/produse/nou?e=validation");
  }
  const slug = slugify(values.slug || values.name);
  const sku = values.sku.trim();
  const { data: created, error } = await sb()
    .from("products")
    .insert({
      name: values.name,
      slug,
      sku,
      short_description: values.shortDescription,
      description: values.description ?? "",
      sale_price: salePrice,
      compare_at_price: values.compareAtPrice ? parseRonToBani(values.compareAtPrice) : null,
      cost_price: values.costPrice ? parseRonToBani(values.costPrice) : 0,
      status: values.status,
      category_id: values.categoryId ?? null,
      is_active: values.status === "ACTIVE",
      is_featured: values.isFeatured ?? false,
      stock_tracking_enabled: values.stockTracking ?? true,
      sort_order: Number(values.sortOrder ?? 0) || 0,
      published_at: values.status === "ACTIVE" ? new Date().toISOString() : null,
    })
    .select("id, name, sale_price")
    .single();
  if (error || !created) redirect(`/admin/produse/nou?e=${productConstraintCode(error?.message)}`);
  const { data: variant, error: variantError } = await sb()
    .from("product_variants")
    .insert({
      product_id: created.id,
      sku: `${sku}-DEF`,
      name: "Standard",
    })
    .select("id")
    .single();
  if (variantError || !variant) {
    await sb().from("products").delete().eq("id", created.id);
    redirect(`/admin/produse/nou?e=${productConstraintCode(variantError?.message)}`);
  }
  await setVariantStock(variant.id, Number(values.stockQuantity ?? 0) || 0);
  await writeAudit({
    actorUserId: actor.id,
    action: "product.create",
    entityType: "Product",
    entityId: created.id,
    after: { name: created.name, salePrice: created.sale_price },
  });
  revalidatePath("/produse");
  redirect(`/admin/produse/${created.id}`);
}
