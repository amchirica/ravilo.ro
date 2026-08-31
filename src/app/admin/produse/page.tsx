import { requirePermission } from "@/server/auth/session";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { formatRon } from "@/lib/money";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type ProductRow = {
  id: string;
  name: string;
  nameEn: string | null;
  sku: string;
  salePrice: number;
  status: string;
  variants: { inventory: { quantity: number; reservedQuantity: number }[] }[];
};

export default async function AdminProducts() {
  await requirePermission("product.read");
  const { data } = isSupabaseConfigured()
    ? await sb()
        .from("products")
        .select("id, name, name_en, sku, sale_price, status, variants:product_variants(inventory:inventory_levels(quantity, reserved_quantity))")
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const rows = camelList<ProductRow>(data);
  const t = await getTranslations("admin");
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-4xl">{t("products")}</h1>
        <Link href="/admin/produse/nou" className="rounded-full bg-ink px-4 py-2 text-sm text-paper">
          {t("newProduct")}
        </Link>
      </div>
      <table className="mt-8 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">{t("name")}</th>
            <th>{t("sku")}</th>
            <th>{t("price")}</th>
            <th>{t("stock")}</th>
            <th>{t("translations")}</th>
            <th>{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((product) => {
            const stock = (product.variants ?? []).reduce(
              (sum, variant) => sum + (variant.inventory ?? []).reduce((s, l) => s + (l.quantity - l.reservedQuantity), 0),
              0,
            );
            return (
              <tr key={product.id} className="border-t border-line">
                <td className="py-2">
                  <Link href={`/admin/produse/${product.id}`} className="underline">
                    {product.name}
                  </Link>
                </td>
                <td>{product.sku}</td>
                <td>{formatRon(product.salePrice)}</td>
                <td>{stock}</td>
                <td>
                  <span className="text-success">RO ✓</span>{" "}
                  <span className={product.nameEn ? "text-success" : "text-warning"}>{product.nameEn ? "EN ✓" : "EN ⚠"}</span>
                </td>
                <td>{product.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
