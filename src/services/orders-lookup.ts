import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { normalizeEmail } from "@/lib/sanitize";

export type TrackedOrder = {
  publicOrderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  history: { status: string; createdAt: string }[];
};

const PUBLIC_STATUSES = ["RECEIVED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

export async function lookupOrderByNumberAndEmail(orderNumber: string, email: string): Promise<TrackedOrder | null> {
  if (!isSupabaseConfigured()) return null;
  const number = orderNumber.trim().toUpperCase().slice(0, 40);
  const mail = normalizeEmail(email);
  if (number.length < 3 || !mail.includes("@")) return null;
  const { data } = await sb()
    .from("orders")
    .select("id, public_order_number, email, status, payment_status, created_at")
    .ilike("public_order_number", number)
    .maybeSingle();
  if (!data || normalizeEmail(String(data.email)) !== mail) return null;
  const { data: history } = await sb()
    .from("order_status_history")
    .select("status, created_at")
    .eq("order_id", data.id)
    .order("created_at", { ascending: true });
  return {
    publicOrderNumber: data.public_order_number,
    status: data.status,
    paymentStatus: data.payment_status,
    createdAt: data.created_at,
    history: camelList<{ status: string; createdAt: string }>(history).filter((row) =>
      PUBLIC_STATUSES.includes(row.status as (typeof PUBLIC_STATUSES)[number]),
    ),
  };
}

export function trackingSteps(current: string) {
  const flow = ["RECEIVED", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
  const index = flow.indexOf(current as (typeof flow)[number]);
  return flow.map((status, step) => ({
    status,
    done: index >= 0 && step <= index,
    current: status === current,
  }));
}

export function mapOrderStatus(order: TrackedOrder): string {
  if (order.status === "CANCELLED") return "CANCELLED";
  if (order.status === "DELIVERED" || order.status === "COMPLETED") return "DELIVERED";
  if (order.status === "SHIPPED") return "SHIPPED";
  if (order.status === "PROCESSING" || order.status === "FULFILLING") return "PROCESSING";
  if (order.paymentStatus === "PAID" || order.status === "CONFIRMED") return "CONFIRMED";
  return "RECEIVED";
}

export function camelOrder(row: unknown) {
  return camelKeys(row);
}
