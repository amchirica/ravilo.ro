import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { Field, Input, Textarea, Button } from "@/components/ui/primitives";
import { AdminImageField } from "@/components/admin/image-field";
import { slugify } from "@/lib/slug";
import { formatRon, percentOf } from "@/lib/money";
import { resolveFormImage } from "@/services/storage";

type BundleRow = {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  description: string;
  descriptionEn: string | null;
  price: number;
  compareAtPrice: number | null;
  imagePath: string | null;
  isActive: boolean;
};

type ProductOption = {
  id: string;
  name: string;
  salePrice: number;
  variantId: string | null;
};

const MIN_ITEMS = 2;
const MAX_ITEMS = 4;

export default async function BundlesAdmin() {
  await requirePermission("bundle.write");
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <AdminHeading k="bundles" />
        <p className="mt-2 text-sm text-mute">Supabase nu este configurat.</p>
      </div>
    );
  }
  const [{ data: bundleRows }, products] = await Promise.all([
    sb().from("bundles").select("*").order("created_at", { ascending: false }),
    loadProductOptions(),
  ]);
  const bundles = camelList<BundleRow>(bundleRows);
  const { data: links } = await sb().from("bundle_items").select("bundle_id, variant_id, quantity");
  const variantToProduct = new Map(products.map((product) => [product.variantId, product.id]));
  const productsByBundle = new Map<string, string[]>();
  for (const link of links ?? []) {
    const productId = variantToProduct.get(link.variant_id as string);
    if (!productId) continue;
    const list = productsByBundle.get(link.bundle_id as string) ?? [];
    list.push(productId);
    productsByBundle.set(link.bundle_id as string, list);
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <div>
        <AdminHeading k="bundles" />
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Creează pachete de 2–4 produse, cu un discount față de prețul separat. Clientul adaugă tot setul în coș, iar
          reducerea se aplică la checkout. Nu ține de Setări magazin.
        </p>
        <ul className="mt-6 space-y-6">
          {bundles.map((bundle) => {
            const percent =
              bundle.compareAtPrice && bundle.compareAtPrice > bundle.price
                ? Math.round(((bundle.compareAtPrice - bundle.price) / bundle.compareAtPrice) * 100)
                : 10;
            return (
              <li key={bundle.id} className="border border-line bg-card p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-mute">/pachete · {bundle.slug}</p>
                <form action={saveBundle.bind(null, bundle.id)} className="mt-3 grid gap-3" encType="multipart/form-data">
                  <Field label="Nume RO">
                    <Input name="name" defaultValue={bundle.name} required />
                  </Field>
                  <Field label="Name EN">
                    <Input name="nameEn" defaultValue={bundle.nameEn ?? ""} />
                  </Field>
                  <Field label="Slug">
                    <Input name="slug" defaultValue={bundle.slug} />
                  </Field>
                  <Field label="Descriere RO">
                    <Textarea name="description" defaultValue={bundle.description} rows={3} />
                  </Field>
                  <Field label="Description EN">
                    <Textarea name="descriptionEn" defaultValue={bundle.descriptionEn ?? ""} rows={3} />
                  </Field>
                  <Field label="Discount % față de suma produselor">
                    <Input name="discountPercent" type="number" min={1} max={40} defaultValue={String(percent)} />
                  </Field>
                  <AdminImageField current={bundle.imagePath} />
                  <ProductChecks products={products} selected={productsByBundle.get(bundle.id) ?? []} />
                  <label className="flex gap-2 text-sm">
                    <input type="checkbox" name="isActive" defaultChecked={bundle.isActive} /> Publicat pe site
                  </label>
                  <p className="text-sm text-mute">
                    Preț kit: {formatRon(bundle.price)}
                    {bundle.compareAtPrice ? ` · separat ${formatRon(bundle.compareAtPrice)}` : ""}
                  </p>
                  <Button type="submit" variant="line">
                    Salvează pachetul
                  </Button>
                </form>
                <form action={deleteBundle.bind(null, bundle.id)} className="mt-3">
                  <button className="text-xs text-mute underline">Șterge</button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        <h2 className="font-serif text-2xl">Pachet nou</h2>
        <form action={createBundle} className="mt-4 grid gap-3" encType="multipart/form-data">
          <Field label="Nume">
            <Input name="name" required />
          </Field>
          <Field label="Name EN">
            <Input name="nameEn" />
          </Field>
          <Field label="Slug">
            <Input name="slug" />
          </Field>
          <Field label="Descriere">
            <Textarea name="description" rows={3} />
          </Field>
          <Field label="Discount %">
            <Input name="discountPercent" type="number" min={1} max={40} defaultValue="10" />
          </Field>
          <AdminImageField />
          <ProductChecks products={products} selected={[]} />
          <Button type="submit">Creează pachetul</Button>
        </form>
      </div>
    </div>
  );
}

function ProductChecks({ products, selected }: { products: ProductOption[]; selected: string[] }) {
  const chosen = new Set(selected);
  return (
    <fieldset className="grid gap-2">
      <legend className="text-[0.8125rem] text-mute">Produse în pachet (2–4)</legend>
      <ul className="max-h-72 space-y-1 overflow-auto border border-line p-2">
        {products.map((product) => (
          <li key={product.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="productIds" value={product.id} defaultChecked={chosen.has(product.id)} disabled={!product.variantId} />
              <span className="min-w-0 flex-1">{product.name}</span>
              <span className="text-mute">{formatRon(product.salePrice)}</span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

async function loadProductOptions(): Promise<ProductOption[]> {
  const { data } = await sb()
    .from("products")
    .select("id, name, sale_price, variants:product_variants(id, is_active, price_override)")
    .eq("status", "ACTIVE")
    .eq("is_active", true)
    .order("name")
    .limit(300);
  return (data ?? []).map((row) => {
    const variants = (row.variants as { id: string; is_active: boolean; price_override: number | null }[] | null) ?? [];
    const variant = variants.find((item) => item.is_active) ?? variants[0];
    const salePrice = Number(variant?.price_override ?? row.sale_price ?? 0);
    return {
      id: String(row.id),
      name: String(row.name),
      salePrice,
      variantId: variant?.id ? String(variant.id) : null,
    };
  });
}

async function variantsForProducts(productIds: string[]) {
  const unique = [...new Set(productIds)].slice(0, MAX_ITEMS);
  if (unique.length < MIN_ITEMS) return [];
  const { data } = await sb()
    .from("product_variants")
    .select("id, product_id, is_active, price_override, product:products(sale_price)")
    .in("product_id", unique)
    .eq("is_active", true);
  const firstByProduct = new Map<string, { variantId: string; unitPrice: number }>();
  for (const row of data ?? []) {
    const productId = String(row.product_id);
    if (firstByProduct.has(productId)) continue;
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const unitPrice = Number(row.price_override ?? (product as { sale_price?: number } | null)?.sale_price ?? 0);
    firstByProduct.set(productId, { variantId: String(row.id), unitPrice });
  }
  return unique
    .map((id) => firstByProduct.get(id))
    .filter((item): item is { variantId: string; unitPrice: number } => Boolean(item));
}

function parseDiscountPercent(formData: FormData) {
  const raw = Number(formData.get("discountPercent") ?? 10);
  if (!Number.isFinite(raw)) return 10;
  return Math.min(40, Math.max(1, Math.round(raw)));
}

function pricesFromItems(items: { unitPrice: number }[], percent: number) {
  const compareAtPrice = items.reduce((sum, item) => sum + item.unitPrice, 0);
  const price = Math.max(0, compareAtPrice - percentOf(compareAtPrice, percent));
  return { price, compareAtPrice };
}

async function uniqueSlug(base: string, exceptId?: string) {
  const slug = slugify(base) || "pachet";
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    let query = sb().from("bundles").select("id").eq("slug", candidate);
    if (exceptId) query = query.neq("id", exceptId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${slug}-${Date.now().toString(36)}`;
}

function revalidateBundles() {
  revalidatePath("/admin/pachete");
  revalidatePath("/pachete");
  revalidatePath("/en/pachete");
  revalidatePath("/");
  revalidatePath("/en");
  revalidatePath("/admin/continut/homepage");
}

async function createBundle(formData: FormData) {
  "use server";
  const actor = await requirePermission("bundle.write");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return;
  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  const items = await variantsForProducts(productIds);
  if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) return;
  const { price, compareAtPrice } = pricesFromItems(items, parseDiscountPercent(formData));
  const imagePath = await resolveFormImage(formData, { createdBy: actor.id, folder: "bundles", current: null });
  const { data, error } = await sb()
    .from("bundles")
    .insert({
      name,
      name_en: String(formData.get("nameEn") ?? "").trim() || null,
      slug: await uniqueSlug(String(formData.get("slug") ?? "") || name),
      description: String(formData.get("description") ?? ""),
      description_en: String(formData.get("descriptionEn") ?? "").trim() || null,
      price,
      compare_at_price: compareAtPrice,
      image_path: imagePath,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Nu am putut crea pachetul.");
  await sb().from("bundle_items").insert(
    items.map((item) => ({ bundle_id: data.id, variant_id: item.variantId, quantity: 1 })),
  );
  await writeAudit({ actorUserId: actor.id, action: "bundle.create", entityType: "Bundle", entityId: data.id, after: { name } });
  revalidateBundles();
}

async function saveBundle(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("bundle.write");
  const { data: existing } = await sb().from("bundles").select("image_path").eq("id", id).maybeSingle();
  const imagePath = await resolveFormImage(formData, {
    createdBy: actor.id,
    folder: "bundles",
    current: typeof existing?.image_path === "string" ? existing.image_path : null,
  });
  const productIds = formData.getAll("productIds").map(String).filter(Boolean);
  const items = await variantsForProducts(productIds);
  const percent = parseDiscountPercent(formData);
  const patch: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    name_en: String(formData.get("nameEn") ?? "").trim() || null,
    slug: await uniqueSlug(String(formData.get("slug") ?? "") || String(formData.get("name") ?? ""), id),
    description: String(formData.get("description") ?? ""),
    description_en: String(formData.get("descriptionEn") ?? "").trim() || null,
    image_path: imagePath,
    is_active: formData.get("isActive") === "on",
    updated_at: new Date().toISOString(),
  };
  if (items.length >= MIN_ITEMS && items.length <= MAX_ITEMS) {
    const priced = pricesFromItems(items, percent);
    patch.price = priced.price;
    patch.compare_at_price = priced.compareAtPrice;
    await sb().from("bundle_items").delete().eq("bundle_id", id);
    await sb().from("bundle_items").insert(items.map((item) => ({ bundle_id: id, variant_id: item.variantId, quantity: 1 })));
  } else if (productIds.length === 0) {
    const { data: current } = await sb().from("bundles").select("compare_at_price").eq("id", id).maybeSingle();
    const compareAt = Number(current?.compare_at_price ?? 0);
    if (compareAt > 0) {
      patch.price = Math.max(0, compareAt - percentOf(compareAt, percent));
    }
  }
  const { error } = await sb().from("bundles").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAudit({ actorUserId: actor.id, action: "bundle.update", entityType: "Bundle", entityId: id, after: { name: patch.name } });
  revalidateBundles();
}

async function deleteBundle(id: string) {
  "use server";
  const actor = await requirePermission("bundle.write");
  await sb().from("bundles").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "bundle.delete", entityType: "Bundle", entityId: id });
  revalidateBundles();
}
