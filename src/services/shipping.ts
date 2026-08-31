import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";

export type ShippingMethodRow = {
  id: string;
  name: string;
  price: number;
  freeAbove: number | null;
  isActive: boolean;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
};

const DEFAULT_SHIPPING = {
  name: "Curier standard",
  provider: "manual",
  price: 1900,
  free_above: null,
  estimated_min_days: 1,
  estimated_max_days: 3,
  is_active: true,
  sort_order: 0,
};

export async function listActiveShippingMethods(): Promise<ShippingMethodRow[]> {
  if (!isSupabaseConfigured()) return [];
  await ensureDefaultShippingMethod();
  const { data } = await sb()
    .from("shipping_methods")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return camelList<ShippingMethodRow>(data);
}

export async function resolveActiveShippingMethod(preferredId?: string): Promise<ShippingMethodRow | null> {
  if (!isSupabaseConfigured()) return null;
  await ensureDefaultShippingMethod();
  if (preferredId) {
    const { data } = await sb()
      .from("shipping_methods")
      .select("*")
      .eq("id", preferredId)
      .eq("is_active", true)
      .maybeSingle();
    if (data) return camelKeys<ShippingMethodRow>(data);
  }
  const { data: first } = await sb()
    .from("shipping_methods")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return first ? camelKeys<ShippingMethodRow>(first) : null;
}

export async function ensureDefaultShippingMethod() {
  if (!isSupabaseConfigured()) return;
  const { count } = await sb().from("shipping_methods").select("id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  await sb().from("shipping_methods").insert(DEFAULT_SHIPPING);
}
