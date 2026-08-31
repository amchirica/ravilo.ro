import { requireStaff } from "@/server/auth/session";
import { isSupabaseConfigured, listRows, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { formatRon } from "@/lib/money";
import { getStoreAnalytics, type AnalyticsPeriod } from "@/services/analytics";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

type OrderRow = {
  id: string;
  publicOrderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  createdAt: string;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isPaid(order: { paymentStatus: string }) {
  return order.paymentStatus === "PAID" || order.paymentStatus === "AUTHORIZED";
}

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  await requireStaff();
  const { period: periodRaw } = await searchParams;
  const period = (periodRaw === "90" ? 90 : periodRaw === "365" ? 365 : 30) as AnalyticsPeriod;
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const recent = await listRows<OrderRow>("orders", { order: "created_at", ascending: false, limit: 8 });
  const paid = await listRows<{ grandTotal: number; paymentStatus: string; createdAt: string }>("orders", {
    eq: ["payment_status", "PAID"],
  });
  const allRecent = isSupabaseConfigured()
    ? camelList<OrderRow>((await sb().from("orders").select("id, public_order_number, status, payment_status, grand_total, created_at").gte("created_at", monthStart).limit(500)).data)
    : [];
  const todayOrders = allRecent.filter((order) => order.createdAt >= todayStart);
  const todayRevenue = todayOrders.filter(isPaid).reduce((sum, order) => sum + order.grandTotal, 0);
  const monthRevenue = allRecent.filter(isPaid).reduce((sum, order) => sum + order.grandTotal, 0);
  const { count: orderCount } = isSupabaseConfigured()
    ? await sb().from("orders").select("id", { count: "exact", head: true })
    : { count: 0 };
  const reviewsRes = isSupabaseConfigured()
    ? await sb().from("reviews").select("id", { count: "exact", head: true }).eq("status", "PENDING")
    : { count: 0, error: null };
  const returnsRes = isSupabaseConfigured()
    ? await sb().from("return_requests").select("id", { count: "exact", head: true }).eq("status", "PENDING")
    : { count: 0, error: null };
  const pendingReviews = reviewsRes.error ? 0 : (reviewsRes.count ?? 0);
  const pendingReturns = returnsRes.error ? 0 : (returnsRes.count ?? 0);
  const analytics = await getStoreAnalytics(period);
  const { count: newCustomers } = isSupabaseConfigured()
    ? await sb().from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart)
    : { count: 0 };
  const { data: lowRaw } = isSupabaseConfigured()
    ? await sb()
        .from("inventory_levels")
        .select("id, quantity, reserved_quantity, variant:product_variants(sku, product:products(name))")
        .lte("quantity", 3)
        .limit(8)
    : { data: [] };
  const lowStock = camelList<{
    id: string;
    quantity: number;
    reservedQuantity: number;
    variant: { sku: string; product: { name: string } };
  }>(lowRaw);
  const revenue = paid.reduce((sum, row) => sum + row.grandTotal, 0);
  const aov = paid.length ? Math.round(revenue / paid.length) : 0;
  const t = await getTranslations("admin");
  return (
    <div>
      <h1 className="font-serif text-4xl">{t("overview")}</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label={t("ordersToday")} value={String(todayOrders.length)} />
        <Stat label={t("revenueToday")} value={formatRon(todayRevenue)} />
        <Stat label={t("ordersMonth")} value={String(allRecent.length)} />
        <Stat label={t("revenueMonth")} value={formatRon(monthRevenue)} />
        <Stat label={t("newCustomers")} value={String(newCustomers ?? 0)} />
        <Stat label={t("lowStock")} value={String(lowStock.length)} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Stat label={t("confirmedRevenue")} value={formatRon(revenue)} />
        <Stat label={t("ordersTotal")} value={String(orderCount ?? 0)} />
        <Stat label={t("aov")} value={formatRon(aov)} />
      </div>
      <p className="mt-3 text-sm text-mute">{t("pendingReviews", { count: pendingReviews })}</p>
      <p className="mt-1 text-sm text-mute">{t("pendingReturns", { count: pendingReturns })}</p>
      <div className="mt-10 flex flex-wrap items-center gap-3 text-sm">
        <h2 className="font-serif text-2xl">{t("analytics")}</h2>
        <Link href="/admin?period=30" className={period === 30 ? "underline" : "text-mute"}>
          30 zile
        </Link>
        <Link href="/admin?period=90" className={period === 90 ? "underline" : "text-mute"}>
          90 zile
        </Link>
        <Link href="/admin?period=365" className={period === 365 ? "underline" : "text-mute"}>
          12 luni
        </Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label={t("analyticsOrders")} value={String(analytics.orders)} />
        <Stat label={t("analyticsRevenue")} value={formatRon(analytics.revenue)} />
        <Stat label={t("aov")} value={formatRon(analytics.aov)} />
        <Stat label={t("analyticsCustomers")} value={String(analytics.customers)} />
      </div>
      <h2 className="mt-12 font-serif text-2xl">{t("recentOrders")}</h2>
      {recent.length === 0 ? (
        <p className="mt-3 text-sm text-mute">{t("noOrders")}</p>
      ) : (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="text-mute">
              <th className="py-2">{t("number")}</th>
              <th>{t("status")}</th>
              <th>{t("payment")}</th>
              <th>{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((order) => (
              <tr key={order.id} className="border-t border-line">
                <td className="py-2">
                  <a href={`/admin/comenzi/${order.id}`} className="underline">
                    {order.publicOrderNumber}
                  </a>
                </td>
                <td>{order.status}</td>
                <td>{order.paymentStatus}</td>
                <td>{formatRon(order.grandTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className="mt-12 font-serif text-2xl">{t("lowStockTitle")}</h2>
      {lowStock.length === 0 ? (
        <p className="mt-3 text-sm text-mute">{t("noLowStock")}</p>
      ) : (
        <ul className="mt-3 text-sm">
          {lowStock.map((row) => (
            <li key={row.id}>
              {row.variant.product.name} · {row.variant.sku} · {row.quantity - row.reservedQuantity} {t("available")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-surface p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-mute">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
