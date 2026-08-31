import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { getStoreSettings } from "@/services/settings";
import { getPublishedProductById, type PublicProduct } from "@/services/catalog";
import type { AppLocale } from "@/lib/i18n";

export async function listBestsellers(locale: AppLocale, take = 8): Promise<PublicProduct[]> {
  const settings = await getStoreSettings();
  if (settings.bestSellerMode === "manual") {
    if (!isSupabaseConfigured()) return [];
    const { data } = await sb()
      .from("products")
      .select("id")
      .eq("is_best_seller_manual", true)
      .eq("status", "ACTIVE")
      .eq("is_active", true)
      .limit(take);
    if (data?.length) {
      const products = await Promise.all(data.map((row) => getPublishedProductById(row.id, locale)));
      return products.filter((item): item is PublicProduct => Boolean(item));
    }
    return [];
  }
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await sb()
    .from("order_items")
    .select("quantity, variant:product_variants(product_id), order:orders(payment_status)")
    .limit(4000);
  if (error || !data?.length) return [];
  const counts = new Map<string, number>();
  for (const row of data) {
    const order = Array.isArray(row.order) ? row.order[0] : row.order;
    const variant = Array.isArray(row.variant) ? row.variant[0] : row.variant;
    const status = (order as { payment_status?: string } | null)?.payment_status;
    const productId = (variant as { product_id?: string } | null)?.product_id;
    if (!productId || (status !== "PAID" && status !== "AUTHORIZED")) continue;
    counts.set(productId, (counts.get(productId) ?? 0) + Number(row.quantity ?? 1));
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
  const products = await Promise.all(ranked.map(([id]) => getPublishedProductById(id, locale)));
  return products.filter((item): item is PublicProduct => Boolean(item));
}
