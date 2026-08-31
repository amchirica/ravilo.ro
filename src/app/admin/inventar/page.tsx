import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { publicStockStatus } from "@/lib/stock";
import { setVariantStock } from "@/services/inventory";
import { revalidatePath } from "next/cache";
import { Input, Button } from "@/components/ui/primitives";

type Level = {
  id: string;
  quantity: number;
  reservedQuantity: number;
  variant: { id: string; sku: string; product: { name: string; lowStockThreshold?: number } };
};

export default async function InventoryAdmin() {
  await requirePermission("inventory.write");
  const { data } = isSupabaseConfigured()
    ? await sb()
        .from("inventory_levels")
        .select("id, quantity, reserved_quantity, variant:product_variants(id, sku, product:products(name, low_stock_threshold))")
        .order("quantity", { ascending: true })
        .limit(100)
    : { data: [] };
  const levels = camelList<Level>(data);
  return (
    <div>
      <AdminHeading k="stock" />
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">Produs</th>
            <th>SKU</th>
            <th>Disponibil</th>
            <th>Rezervat</th>
            <th>Status</th>
            <th>Ajustare</th>
          </tr>
        </thead>
        <tbody>
          {levels.map((level) => {
            const available = level.quantity - level.reservedQuantity;
            const status = publicStockStatus(available, level.variant.product.lowStockThreshold ?? 3);
            const label = status === "OUT" ? "Stoc epuizat" : status === "LOW" ? "Stoc redus" : "În stoc";
            return (
              <tr key={level.id} className="border-t border-line">
                <td className="py-2">{level.variant.product.name}</td>
                <td>{level.variant.sku}</td>
                <td>{available}</td>
                <td>{level.reservedQuantity}</td>
                <td>{label}</td>
                <td>
                  <form action={adjustStock.bind(null, level.variant.id)} className="flex items-center gap-2">
                    <Input name="quantity" defaultValue={String(level.quantity)} className="w-20" />
                    <Button type="submit" variant="line">
                      Salvează
                    </Button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function adjustStock(variantId: string, formData: FormData) {
  "use server";
  await requirePermission("inventory.write");
  const quantity = Math.max(0, Number(formData.get("quantity") ?? 0));
  await setVariantStock(variantId, quantity);
  revalidatePath("/admin/inventar");
}
