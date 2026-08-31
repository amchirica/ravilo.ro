import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { Field, Input, Button } from "@/components/ui/primitives";
import { revalidatePath } from "next/cache";

export default async function SearchMerchAdmin() {
  await requirePermission("content.write");
  const synonyms = isSupabaseConfigured()
    ? camelList<{ id: string; term: string; synonym: string }>((await sb().from("search_synonyms").select("*").order("term")).data)
    : [];
  const boosts = isSupabaseConfigured()
    ? camelList<{ id: string; query: string; targetType: string; targetSlug: string }>((await sb().from("search_boosts").select("*")).data)
    : [];
  const promotions = isSupabaseConfigured()
    ? camelList<{ id: string; query: string; productId: string }>((await sb().from("search_promotions").select("*")).data)
    : [];
  return (
    <div className="max-w-2xl">
      <AdminHeading k="searchMerch" />
      <p className="mt-2 text-sm text-mute">Sinonime (rucsac = backpack) și boost-uri (cadou → colecție).</p>
      <h2 className="mt-8 font-serif text-2xl">Sinonime</h2>
      <ul className="mt-3 text-sm">
        {synonyms.map((row) => (
          <li key={row.id}>
            {row.term} = {row.synonym}
          </li>
        ))}
        {synonyms.length === 0 ? <li className="text-mute">Niciun sinonim.</li> : null}
      </ul>
      <form action={addSynonym} className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Termen">
          <Input name="term" required />
        </Field>
        <Field label="Sinonim">
          <Input name="synonym" required />
        </Field>
        <Button type="submit">Adaugă</Button>
      </form>
      <h2 className="mt-10 font-serif text-2xl">Boost-uri</h2>
      <ul className="mt-3 text-sm">
        {boosts.map((row) => (
          <li key={row.id}>
            “{row.query}” → {row.targetType} /{row.targetSlug}
          </li>
        ))}
        {boosts.length === 0 ? <li className="text-mute">Niciun boost.</li> : null}
      </ul>
      <form action={addBoost} className="mt-4 grid gap-3">
        <Field label="Query">
          <Input name="query" required placeholder="cadou" />
        </Field>
        <Field label="Tip (collection/category/product)">
          <Input name="targetType" defaultValue="collection" />
        </Field>
        <Field label="Slug">
          <Input name="targetSlug" required />
        </Field>
        <Button type="submit">Adaugă boost</Button>
      </form>
      <h2 className="mt-10 font-serif text-2xl">Rezultate promovate</h2>
      <ul className="mt-3 text-sm">
        {promotions.map((row) => (
          <li key={row.id}>
            “{row.query}” → produs {row.productId}
          </li>
        ))}
        {promotions.length === 0 ? <li className="text-mute">Niciun rezultat promovat.</li> : null}
      </ul>
      <form action={addPromotion} className="mt-4 grid gap-3">
        <Field label="Query">
          <Input name="query" required placeholder="cadou" />
        </Field>
        <Field label="Product ID">
          <Input name="productId" required />
        </Field>
        <Button type="submit">Promovează</Button>
      </form>
    </div>
  );
}

async function addSynonym(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  await sb().from("search_synonyms").insert({
    term: String(formData.get("term") ?? "").trim().toLowerCase(),
    synonym: String(formData.get("synonym") ?? "").trim().toLowerCase(),
  });
  revalidatePath("/admin/marketing/cautare");
}

async function addBoost(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  await sb().from("search_boosts").insert({
    query: String(formData.get("query") ?? "").trim().toLowerCase(),
    target_type: String(formData.get("targetType") ?? "collection"),
    target_slug: String(formData.get("targetSlug") ?? "").trim(),
  });
  revalidatePath("/admin/marketing/cautare");
}

async function addPromotion(formData: FormData) {
  "use server";
  await requirePermission("content.write");
  await sb().from("search_promotions").insert({
    query: String(formData.get("query") ?? "").trim().toLowerCase(),
    product_id: String(formData.get("productId") ?? "").trim(),
    sort_order: 0,
  });
  revalidatePath("/admin/marketing/cautare");
}
