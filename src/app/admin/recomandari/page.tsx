import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { Field, Button } from "@/components/ui/primitives";
import { revalidatePath } from "next/cache";

export default async function RecommendationsAdmin() {
  await requirePermission("product.write");
  const { data: products } = await sb().from("products").select("id, name").eq("status", "ACTIVE").order("name").limit(200);
  const { data: relations } = await sb().from("product_relations").select("product_id, related_product_id, kind, sort_order").limit(80);
  const byId = new Map((products ?? []).map((row) => [row.id as string, row.name as string]));
  const rows = camelList<{ productId: string; relatedProductId: string; kind: string }>(relations);
  return (
    <div className="max-w-2xl">
      <AdminHeading k="recommendations" />
      <p className="mt-2 text-sm text-mute">RELATED, UPSELL, CROSS_SELL, FREQUENTLY_BOUGHT.</p>
      <form action={addRelation} className="mt-8 grid gap-3">
        <Field label="Produs">
          <select name="productId" className="w-full rounded-md border border-line px-3 py-2" required>
            {(products ?? []).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Relat">
          <select name="relatedProductId" className="w-full rounded-md border border-line px-3 py-2" required>
            {(products ?? []).map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tip">
          <select name="kind" className="w-full rounded-md border border-line px-3 py-2">
            <option value="RELATED">RELATED</option>
            <option value="UPSELL">UPSELL</option>
            <option value="CROSS_SELL">CROSS_SELL</option>
            <option value="FREQUENTLY_BOUGHT">FREQUENTLY_BOUGHT</option>
          </select>
        </Field>
        <Button type="submit">Adaugă</Button>
      </form>
      <ul className="mt-8 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={`${row.productId}-${row.relatedProductId}-${row.kind}`} className="flex justify-between gap-2 border-b border-line py-2">
            <span>
              {byId.get(row.productId) ?? row.productId} → {byId.get(row.relatedProductId) ?? row.relatedProductId} ({row.kind})
            </span>
            <form action={deleteRelation.bind(null, row.productId, row.relatedProductId, row.kind)}>
              <button className="text-xs underline">Șterge</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function addRelation(formData: FormData) {
  "use server";
  await requirePermission("product.write");
  const productId = String(formData.get("productId") ?? "");
  const relatedProductId = String(formData.get("relatedProductId") ?? "");
  if (!productId || !relatedProductId || productId === relatedProductId) return;
  await sb().from("product_relations").insert({
    product_id: productId,
    related_product_id: relatedProductId,
    kind: String(formData.get("kind") ?? "RELATED"),
    sort_order: 0,
  });
  revalidatePath("/admin/recomandari");
  revalidatePath("/produse");
  revalidatePath("/");
}

async function deleteRelation(productId: string, relatedProductId: string, kind: string) {
  "use server";
  await requirePermission("product.write");
  await sb()
    .from("product_relations")
    .delete()
    .eq("product_id", productId)
    .eq("related_product_id", relatedProductId)
    .eq("kind", kind);
  revalidatePath("/admin/recomandari");
}
