import { requirePermission } from "@/server/auth/session";
import { sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { notFound, redirect } from "next/navigation";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { FileUploadForm } from "@/components/admin/file-upload-form";
import { Tabs } from "@/components/ui/tabs";
import { parseRonToBani, formatRon } from "@/lib/money";
import { writeAudit } from "@/server/audit";
import { translationMissing } from "@/lib/i18n";
import { storeUpload, readUploadedFile } from "@/services/storage";
import { setVariantStock } from "@/services/inventory";
import { slugify } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import { productConstraintCode, productSaveMessage } from "@/lib/product-save";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(160),
  nameEn: z.string().max(160).optional(),
  shortDescription: z.string().max(300),
  shortDescriptionEn: z.string().max(300).optional(),
  description: z.string().max(8000),
  descriptionEn: z.string().max(8000).optional(),
  salePrice: z.string(),
  compareAtPrice: z.string().optional(),
  costPrice: z.string().optional(),
  sku: z.string().min(1).max(64),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  whyWeChose: z.string().max(4000).optional(),
  whyWeChoseEn: z.string().max(4000).optional(),
  howItWorks: z.string().max(4000).optional(),
  howItWorksEn: z.string().max(4000).optional(),
  specifications: z.string().max(4000).optional(),
  specificationsEn: z.string().max(4000).optional(),
  compatibility: z.string().max(4000).optional(),
  compatibilityEn: z.string().max(4000).optional(),
  inTheBox: z.string().max(4000).optional(),
  inTheBoxEn: z.string().max(4000).optional(),
  seoTitle: z.string().max(180).optional(),
  seoTitleEn: z.string().max(180).optional(),
  seoDescription: z.string().max(300).optional(),
  seoDescriptionEn: z.string().max(300).optional(),
  tags: z.string().optional(),
  slug: z.string().max(160).optional(),
  categoryId: z.string().uuid().optional(),
  sortOrder: z.string().optional(),
  stockQuantity: z.string().optional(),
  stockTracking: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isRaviloPick: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isBestSellerManual: z.boolean().optional(),
});

type ProductRow = {
  id: string;
  name: string;
  nameEn: string | null;
  sku: string;
  salePrice: number;
  compareAtPrice: number | null;
  costPrice: number;
  shortDescription: string;
  shortDescriptionEn: string | null;
  description: string;
  descriptionEn: string | null;
  whyWeChose: string;
  whyWeChoseEn: string | null;
  howItWorks: string;
  howItWorksEn: string | null;
  specifications: string;
  specificationsEn: string | null;
  compatibility: string;
  compatibilityEn: string | null;
  inTheBox: string;
  inTheBoxEn: string | null;
  seoTitle: string | null;
  seoTitleEn: string | null;
  seoDescription: string | null;
  seoDescriptionEn: string | null;
  tags: string[] | null;
  isFeatured: boolean;
  isRaviloPick: boolean;
  isNew: boolean;
  isBestSellerManual?: boolean;
  slug: string;
  categoryId: string | null;
  sortOrder: number;
  stockTrackingEnabled: boolean;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt: Date | null;
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; m?: string }>;
}) {
  await requirePermission("product.write");
  const { id } = await params;
  const { e, m } = await searchParams;
  const { data } = await sb().from("products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const product = camelKeys<ProductRow>(data);
  const { data: categoryRows } = await sb().from("categories").select("id, name").order("name");
  const { data: variantRows } = await sb()
    .from("product_variants")
    .select("id, sku, inventory:inventory_levels(quantity, reserved_quantity)")
    .eq("product_id", id);
  const { data: mediaRows } = await sb().from("product_media").select("*").eq("product_id", id).order("sort_order");
  const firstVariant = (variantRows ?? [])[0] as
    | { id: string; sku: string; inventory: { quantity: number; reserved_quantity: number }[] }
    | undefined;
  const stockQty = firstVariant?.inventory?.[0]?.quantity ?? 0;
  const enMissing = translationMissing(product.nameEn);
  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl">{product.name}</h1>
        <span className="text-xs uppercase tracking-[0.16em] text-success">RO ✓</span>
        <span className={`text-xs uppercase tracking-[0.16em] ${enMissing ? "text-warning" : "text-success"}`}>
          {enMissing ? "EN ⚠" : "EN ✓"}
        </span>
      </div>
      <p className="mt-2 text-sm text-mute">SKU {product.sku} · cost intern {formatRon(product.costPrice)} (doar admin)</p>
      {productSaveMessage(e) ? <p className="mt-4 text-sm text-warning">{productSaveMessage(e)}</p> : null}
      <form action={updateProduct.bind(null, product.id)} noValidate className="mt-8">
        <Tabs
          tabs={[
            {
              id: "general",
              label: "General",
              children: (
                <div className="grid gap-4">
                  <Field label="SKU">
                    <Input name="sku" defaultValue={product.sku} required />
                  </Field>
                  <Field label="Slug">
                    <Input name="slug" defaultValue={product.slug} required />
                  </Field>
                  <Field label="Categorie">
                    <select name="categoryId" defaultValue={product.categoryId ?? ""} className="w-full rounded-md border border-line bg-paper px-3 py-2">
                      <option value="">—</option>
                      {(categoryRows ?? []).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ordine">
                    <Input name="sortOrder" defaultValue={String(product.sortOrder ?? 0)} />
                  </Field>
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} /> Featured
                  </label>
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="isRaviloPick" defaultChecked={product.isRaviloPick} /> RAVILO Pick
                  </label>
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="isNew" defaultChecked={product.isNew} /> New
                  </label>
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="isBestSellerManual" defaultChecked={Boolean(product.isBestSellerManual)} /> Best seller (manual)
                  </label>
                  <Field label="Status">
                    <select name="status" defaultValue={product.status} className="w-full rounded-md border border-line bg-paper px-3 py-2">
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Activ</option>
                      <option value="ARCHIVED">Arhivat</option>
                    </select>
                  </Field>
                  <Field label="Tags (comma)">
                    <Input name="tags" defaultValue={(product.tags ?? []).join(", ")} />
                  </Field>
                </div>
              ),
            },
            {
              id: "pricing",
              label: "Pricing",
              children: (
                <div className="grid gap-4">
                  <Field label="Preț vânzare (RON)">
                    <Input name="salePrice" defaultValue={(product.salePrice / 100).toFixed(2)} required />
                  </Field>
                  <Field label="Compare at (RON, opțional)">
                    <Input name="compareAtPrice" defaultValue={product.compareAtPrice ? (product.compareAtPrice / 100).toFixed(2) : ""} />
                  </Field>
                  <Field label="Cost (RON, intern)">
                    <Input name="costPrice" defaultValue={(product.costPrice / 100).toFixed(2)} />
                  </Field>
                </div>
              ),
            },
            {
              id: "inventory",
              label: "Inventory",
              children: (
                <div className="grid gap-4">
                  <Field label="Stoc (variantă principală)">
                    <Input name="stockQuantity" defaultValue={String(stockQty)} />
                  </Field>
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="stockTracking" defaultChecked={product.stockTrackingEnabled} /> Urmărește stocul (fără stoc negativ)
                  </label>
                  <p className="text-sm text-mute">Reserved nu se expune public. Ajustările detaliate rămân în Stoc.</p>
                </div>
              ),
            },
            {
              id: "media",
              label: "Media",
              children: (
                <div className="grid gap-4">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {(mediaRows ?? []).map((media) => (
                      <li key={media.id} className="border border-line p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={media.storage_path} alt={media.alt ?? ""} className="h-32 w-full object-cover" />
                        <button type="submit" form={`delete-media-${media.id}`} className="mt-2 text-xs underline">
                          Șterge
                        </button>
                      </li>
                    ))}
                  </ul>
                  {e === "file" ? <p className="text-sm text-warning">Alege un fișier imagine (JPEG, PNG, WebP sau AVIF).</p> : null}
                  {e === "upload" ? (
                    <p className="text-sm text-warning">{m ? decodeURIComponent(m) : "Upload-ul a eșuat. Încearcă din nou."}</p>
                  ) : null}
                  <FileUploadForm
                    action={uploadProductImage}
                    fields={{ productId: product.id }}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    label="Imagine nouă"
                    submitLabel="Încarcă imagine"
                  />
                  <p className="text-sm text-mute">Upload-ul salvează în Supabase Storage, nu Base64.</p>
                </div>
              ),
            },
            {
              id: "attributes",
              label: "Attributes",
              children: (
                <div className="grid gap-4">
                  <Field label="De ce l-am ales (RO)">
                    <Textarea name="whyWeChose" defaultValue={product.whyWeChose} />
                  </Field>
                  <Field label="Cum funcționează (RO)">
                    <Textarea name="howItWorks" defaultValue={product.howItWorks ?? ""} />
                  </Field>
                  <Field label="Specificații (RO)">
                    <Textarea name="specifications" defaultValue={product.specifications ?? ""} />
                  </Field>
                  <Field label="Compatibilitate (RO)">
                    <Textarea name="compatibility" defaultValue={product.compatibility ?? ""} />
                  </Field>
                  <Field label="În cutie (RO)">
                    <Textarea name="inTheBox" defaultValue={product.inTheBox ?? ""} />
                  </Field>
                </div>
              ),
            },
            {
              id: "translations",
              label: "Translations",
              children: (
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="grid gap-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-success">Română</p>
                    <Field label="Nume">
                      <Input name="name" defaultValue={product.name} required />
                    </Field>
                    <Field label="Descriere scurtă">
                      <Textarea name="shortDescription" defaultValue={product.shortDescription} />
                    </Field>
                    <Field label="Descriere">
                      <Textarea name="description" rows={6} defaultValue={product.description} />
                    </Field>
                  </div>
                  <div className="grid gap-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-warning">English {enMissing ? "⚠" : "✓"}</p>
                    <Field label="Name">
                      <Input name="nameEn" defaultValue={product.nameEn ?? ""} />
                    </Field>
                    <Field label="Short description">
                      <Textarea name="shortDescriptionEn" defaultValue={product.shortDescriptionEn ?? ""} />
                    </Field>
                    <Field label="Description">
                      <Textarea name="descriptionEn" rows={6} defaultValue={product.descriptionEn ?? ""} />
                    </Field>
                    <Field label="Why we chose">
                      <Textarea name="whyWeChoseEn" defaultValue={product.whyWeChoseEn ?? ""} />
                    </Field>
                    <Field label="How it works">
                      <Textarea name="howItWorksEn" defaultValue={product.howItWorksEn ?? ""} />
                    </Field>
                    <Field label="Specifications">
                      <Textarea name="specificationsEn" defaultValue={product.specificationsEn ?? ""} />
                    </Field>
                    <Field label="Compatibility">
                      <Textarea name="compatibilityEn" defaultValue={product.compatibilityEn ?? ""} />
                    </Field>
                    <Field label="In the box">
                      <Textarea name="inTheBoxEn" defaultValue={product.inTheBoxEn ?? ""} />
                    </Field>
                  </div>
                </div>
              ),
            },
            {
              id: "seo",
              label: "SEO",
              children: (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="SEO title RO">
                    <Input name="seoTitle" defaultValue={product.seoTitle ?? ""} />
                  </Field>
                  <Field label="SEO title EN">
                    <Input name="seoTitleEn" defaultValue={product.seoTitleEn ?? ""} />
                  </Field>
                  <Field label="SEO description RO">
                    <Textarea name="seoDescription" defaultValue={product.seoDescription ?? ""} />
                  </Field>
                  <Field label="SEO description EN">
                    <Textarea name="seoDescriptionEn" defaultValue={product.seoDescriptionEn ?? ""} />
                  </Field>
                </div>
              ),
            },
          ]}
        />
        <Button type="submit" className="mt-8">
          Salvează
        </Button>
      </form>
      {(mediaRows ?? []).map((media) => (
        <form
          key={media.id}
          id={`delete-media-${media.id}`}
          action={deleteProductImage.bind(null, product.id, media.id)}
          hidden
        />
      ))}
      <div className="mt-8 flex flex-wrap gap-3">
        <form action={duplicateProduct.bind(null, product.id)}>
          <Button type="submit" variant="line">
            Duplică
          </Button>
        </form>
        <form action={archiveProduct.bind(null, product.id)}>
          <Button type="submit" variant="line">
            Arhivează
          </Button>
        </form>
        <ConfirmForm
          action={deleteProduct.bind(null, product.id)}
          message="Ștergi definitiv produsul? Dispare din magazin, coșuri și colecții. Comenzile rămân ca snapshot."
        >
          <Button type="submit" variant="danger">
            Șterge produsul
          </Button>
        </ConfirmForm>
      </div>
    </div>
  );
}

async function updateProduct(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const fail = (code: string) => redirect(`/admin/produse/${id}?e=${code}`);
  const { data: existingRaw } = await sb().from("products").select("*").eq("id", id).maybeSingle();
  if (!existingRaw) throw new Error("Missing product");
  const existing = camelKeys<ProductRow>(existingRaw);
  const parsed = schema.safeParse({
    name: formData.get("name"),
    nameEn: String(formData.get("nameEn") ?? ""),
    shortDescription: formData.get("shortDescription") ?? "",
    shortDescriptionEn: String(formData.get("shortDescriptionEn") ?? ""),
    description: formData.get("description") ?? "",
    descriptionEn: String(formData.get("descriptionEn") ?? ""),
    salePrice: formData.get("salePrice"),
    compareAtPrice: String(formData.get("compareAtPrice") ?? "") || undefined,
    costPrice: String(formData.get("costPrice") ?? "") || undefined,
    sku: formData.get("sku"),
    status: formData.get("status"),
    whyWeChose: String(formData.get("whyWeChose") ?? ""),
    whyWeChoseEn: String(formData.get("whyWeChoseEn") ?? ""),
    howItWorks: String(formData.get("howItWorks") ?? ""),
    howItWorksEn: String(formData.get("howItWorksEn") ?? ""),
    specifications: String(formData.get("specifications") ?? ""),
    specificationsEn: String(formData.get("specificationsEn") ?? ""),
    compatibility: String(formData.get("compatibility") ?? ""),
    compatibilityEn: String(formData.get("compatibilityEn") ?? ""),
    inTheBox: String(formData.get("inTheBox") ?? ""),
    inTheBoxEn: String(formData.get("inTheBoxEn") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    seoTitleEn: String(formData.get("seoTitleEn") ?? ""),
    seoDescription: String(formData.get("seoDescription") ?? ""),
    seoDescriptionEn: String(formData.get("seoDescriptionEn") ?? ""),
    tags: String(formData.get("tags") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    categoryId: String(formData.get("categoryId") ?? "") || undefined,
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    stockQuantity: String(formData.get("stockQuantity") ?? ""),
    stockTracking: formData.get("stockTracking") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    isRaviloPick: formData.get("isRaviloPick") === "on",
    isNew: formData.get("isNew") === "on",
    isBestSellerManual: formData.get("isBestSellerManual") === "on",
  });
  if (!parsed.success) {
    fail("validation");
    return;
  }
  const values = parsed.data;
  let salePrice = 0;
  try {
    salePrice = parseRonToBani(values.salePrice);
  } catch {
    fail("validation");
  }
  const { data: updatedRaw, error } = await sb()
    .from("products")
    .update({
      name: values.name,
      name_en: values.nameEn || null,
      sku: values.sku.trim(),
      short_description: values.shortDescription,
      short_description_en: values.shortDescriptionEn || null,
      description: values.description,
      description_en: values.descriptionEn || null,
      sale_price: salePrice,
      compare_at_price: values.compareAtPrice ? parseRonToBani(values.compareAtPrice) : null,
      cost_price: values.costPrice ? parseRonToBani(values.costPrice) : existing.costPrice,
      status: values.status,
      is_active: values.status === "ACTIVE",
      why_we_chose: values.whyWeChose ?? "",
      why_we_chose_en: values.whyWeChoseEn || null,
      how_it_works: values.howItWorks ?? "",
      how_it_works_en: values.howItWorksEn || null,
      specifications: values.specifications ?? "",
      specifications_en: values.specificationsEn || null,
      compatibility: values.compatibility ?? "",
      compatibility_en: values.compatibilityEn || null,
      in_the_box: values.inTheBox ?? "",
      in_the_box_en: values.inTheBoxEn || null,
      seo_title: values.seoTitle || null,
      seo_title_en: values.seoTitleEn || null,
      seo_description: values.seoDescription || null,
      seo_description_en: values.seoDescriptionEn || null,
      tags: (values.tags ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      is_featured: values.isFeatured,
      is_ravilo_pick: values.isRaviloPick,
      is_new: values.isNew,
      is_best_seller_manual: values.isBestSellerManual,
      slug: slugify(values.slug || values.name),
      category_id: values.categoryId ?? null,
      sort_order: Number(values.sortOrder ?? 0) || 0,
      stock_tracking_enabled: values.stockTracking ?? true,
      published_at:
        values.status === "ACTIVE"
          ? (existing.publishedAt instanceof Date ? existing.publishedAt : new Date()).toISOString()
          : existing.publishedAt instanceof Date
            ? existing.publishedAt.toISOString()
            : existing.publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("sale_price, status")
    .single();
  if (error || !updatedRaw) {
    fail(productConstraintCode(error?.message));
    return;
  }
  const { data: variant } = await sb().from("product_variants").select("id").eq("product_id", id).limit(1).maybeSingle();
  if (variant && values.stockQuantity != null && values.stockQuantity !== "") {
    await setVariantStock(variant.id, Number(values.stockQuantity) || 0);
  }
  await writeAudit({
    actorUserId: actor.id,
    action: "product.update",
    entityType: "Product",
    entityId: id,
    before: { salePrice: existing.salePrice, status: existing.status },
    after: { salePrice: updatedRaw.sale_price, status: updatedRaw.status },
  });
  revalidatePath("/produse");
  revalidatePath("/");
  revalidatePath("/noutati");
  revalidatePath("/best-sellers");
  revalidatePath("/categorii");
  revalidatePath(`/produs/${slugify(values.slug || values.name)}`);
  redirect(`/admin/produse/${id}`);
}

async function uploadProductImage(formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const productId = String(formData.get("productId") ?? "");
  if (!productId) redirect("/admin/produse");
  let file: File;
  try {
    file = readUploadedFile(formData);
  } catch {
    redirect(`/admin/produse/${productId}?e=file`);
  }
  try {
    const uploaded = await storeUpload(file, { bucket: "products", createdBy: actor.id, alt: "" });
    const { count } = await sb().from("product_media").select("id", { count: "exact", head: true }).eq("product_id", productId);
    const { error } = await sb().from("product_media").insert({
      product_id: productId,
      type: "IMAGE",
      asset_id: uploaded.assetId,
      storage_path: uploaded.storagePath,
      alt: "",
      sort_order: count ?? 0,
      is_primary: !count,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload-ul a eșuat";
    redirect(`/admin/produse/${productId}?e=upload&m=${encodeURIComponent(message.slice(0, 160))}`);
  }
  revalidatePath(`/admin/produse/${productId}`);
  redirect(`/admin/produse/${productId}`);
}

async function deleteProductImage(productId: string, mediaId: string) {
  "use server";
  await requirePermission("product.write");
  const { error } = await sb().from("product_media").delete().eq("id", mediaId).eq("product_id", productId);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/produse/${productId}`);
  redirect(`/admin/produse/${productId}`);
}

async function duplicateProduct(id: string) {
  "use server";
  const actor = await requirePermission("product.write");
  const { data } = await sb().from("products").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("Missing product");
  const copy = { ...data };
  delete copy.id;
  copy.name = `${copy.name} (copie)`;
  copy.slug = `${copy.slug}-copie-${Date.now().toString(36).slice(-4)}`;
  copy.sku = `${copy.sku}-C${Date.now().toString(36).slice(-4)}`.slice(0, 64);
  copy.status = "DRAFT";
  copy.is_active = false;
  copy.published_at = null;
  copy.created_at = new Date().toISOString();
  copy.updated_at = new Date().toISOString();
  const { data: created, error } = await sb().from("products").insert(copy).select("id").single();
  if (error || !created) redirect(`/admin/produse/${id}?e=${productConstraintCode(error?.message)}`);
  const { data: variant } = await sb()
    .from("product_variants")
    .insert({ product_id: created.id, sku: `${copy.sku}-DEF`, name: "Standard" })
    .select("id")
    .single();
  if (variant) await setVariantStock(variant.id, 0);
  await writeAudit({ actorUserId: actor.id, action: "product.duplicate", entityType: "Product", entityId: created.id, after: { from: id } });
  redirect(`/admin/produse/${created.id}`);
}

async function archiveProduct(id: string) {
  "use server";
  const actor = await requirePermission("product.write");
  const { error } = await sb()
    .from("products")
    .update({ status: "ARCHIVED", is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "product.archive", entityType: "Product", entityId: id });
  revalidatePath("/produse");
  redirect(`/admin/produse/${id}`);
}

async function deleteProduct(id: string) {
  "use server";
  const actor = await requirePermission("product.write");
  const { data: variants } = await sb().from("product_variants").select("id").eq("product_id", id);
  const variantIds = (variants ?? []).map((row) => row.id);
  if (variantIds.length) {
    await sb().from("cart_items").delete().in("variant_id", variantIds);
    await sb().from("inventory_transactions").delete().in("variant_id", variantIds);
  }
  const { error } = await sb().from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "product.delete", entityType: "Product", entityId: id });
  revalidatePath("/produse");
  revalidatePath("/");
  revalidatePath("/noutati");
  revalidatePath("/best-sellers");
  revalidatePath("/categorii");
  revalidatePath("/admin/produse");
  redirect("/admin/produse");
}
