import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { sb } from "@/lib/supabase/db";
import { getStoreSettings, saveStoreSettings } from "@/services/settings";
import { writeAudit } from "@/server/audit";
import { Button, Field } from "@/components/ui/primitives";
import { revalidatePath } from "next/cache";
import { STOREFRONT_CACHE, revalidateStorefrontTag } from "@/lib/storefront-cache";

type ProductPick = {
  id: string;
  name: string;
  slug: string;
  isBestSellerManual: boolean;
  isFeatured: boolean;
};

export default async function BestSellersAdmin() {
  await requirePermission("product.write");
  const settings = await getStoreSettings();
  const { data } = await sb()
    .from("products")
    .select("id, name, slug, is_best_seller_manual, is_featured")
    .eq("status", "ACTIVE")
    .eq("is_active", true)
    .order("name")
    .limit(300);
  const products = (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    isBestSellerManual: Boolean(row.is_best_seller_manual),
    isFeatured: Boolean(row.is_featured),
  })) as ProductPick[];
  return (
    <div className="max-w-3xl">
      <AdminHeading k="bestSellers" />
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Alege produsele pe care vrei să le vezi pe{" "}
        <Link href="/best-sellers" className="underline underline-offset-4" target="_blank">
          /best-sellers
        </Link>{" "}
        și pe homepage. Nu este Setări magazin — aici e marketing, nu CUI sau TVA.
      </p>
      <form action={saveMerch} className="mt-8 grid gap-6">
        <Field label="Ce apare pe Best Sellers">
          <select name="bestSellerMode" defaultValue={settings.bestSellerMode} className="w-full rounded-md border border-line px-3 py-2">
            <option value="auto">Comenzi reale, iar dacă nu există vânzări — produsele bifate mai jos</option>
            <option value="manual">Doar produsele bifate mai jos (selecție de marketing)</option>
          </select>
        </Field>
        <fieldset className="grid gap-2">
          <legend className="text-[0.8125rem] text-mute">Produse promovate</legend>
          {products.length === 0 ? (
            <p className="text-sm text-mute">Nu există produse active. Adaugă-le din Magazin → Produse.</p>
          ) : (
            <ul className="divide-y divide-line border border-line">
              {products.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-3 py-2.5">
                  <input type="checkbox" name="ids" value={product.id} defaultChecked={product.isBestSellerManual} />
                  <span className="min-w-0 flex-1 text-sm">{product.name}</span>
                  {product.isFeatured ? <span className="text-[11px] uppercase tracking-widest text-mute">featured</span> : null}
                </li>
              ))}
            </ul>
          )}
        </fieldset>
        <Button type="submit">Salvează selecția</Button>
      </form>
    </div>
  );
}

async function saveMerch(formData: FormData) {
  "use server";
  const actor = await requirePermission("product.write");
  const mode = String(formData.get("bestSellerMode") ?? "auto") === "manual" ? "manual" : "auto";
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const current = await getStoreSettings();
  await saveStoreSettings({ ...current, bestSellerMode: mode }, actor.id);
  await sb().from("products").update({ is_best_seller_manual: false }).eq("status", "ACTIVE");
  if (ids.length) {
    await sb().from("products").update({ is_best_seller_manual: true }).in("id", ids);
  }
  await writeAudit({
    actorUserId: actor.id,
    action: "bestsellers.update",
    entityType: "Product",
    entityId: "manual",
    after: { mode, count: ids.length },
  });
  revalidatePath("/admin/best-sellers");
  revalidatePath("/best-sellers");
  revalidatePath("/en/best-sellers");
  revalidatePath("/");
  revalidatePath("/en");
  revalidateStorefrontTag(STOREFRONT_CACHE.settings);
}
