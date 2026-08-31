import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";

export type AnalyticsPeriod = 30 | 90 | 365;

type PaidOrder = { grandTotal: number; paymentStatus: string; createdAt: string };

function isPaid(order: { paymentStatus: string }) {
  return order.paymentStatus === "PAID" || order.paymentStatus === "AUTHORIZED";
}

export async function getStoreAnalytics(period: AnalyticsPeriod) {
  const since = new Date();
  since.setDate(since.getDate() - period);
  const sinceIso = since.toISOString();
  if (!isSupabaseConfigured()) {
    return { period, orders: 0, revenue: 0, aov: 0, customers: 0 };
  }
  const { data: orderRaw } = await sb()
    .from("orders")
    .select("grand_total, payment_status, created_at")
    .gte("created_at", sinceIso)
    .limit(5000);
  const paid = camelList<PaidOrder>(orderRaw).filter(isPaid);
  const revenue = paid.reduce((sum, row) => sum + row.grandTotal, 0);
  const { count: customers } = await sb()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "CUSTOMER")
    .gte("created_at", sinceIso);
  return {
    period,
    orders: paid.length,
    revenue,
    aov: paid.length ? Math.round(revenue / paid.length) : 0,
    customers: customers ?? 0,
  };
}
