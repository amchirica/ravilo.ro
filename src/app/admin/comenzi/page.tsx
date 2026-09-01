import { requirePermission } from "@/server/auth/session";
import { listRows, sb } from "@/lib/supabase/db";
import { formatRon } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

type OrderRow = {
  id: string;
  publicOrderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  createdAt?: string;
};

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("order.read");
  const { q } = await searchParams;
  const query = q?.trim();
  let rows: OrderRow[];
  if (query) {
    const safe = query.replace(/[%_,]/g, " ").slice(0, 80);
    const { data } = await sb()
      .from("orders")
      .select("id, public_order_number, email, status, payment_status, grand_total, created_at")
      .or(`public_order_number.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`)
      .order("created_at", { ascending: false })
      .limit(80);
    rows = (data ?? []).map((row) => ({
      id: row.id,
      publicOrderNumber: row.public_order_number,
      email: row.email,
      status: row.status,
      paymentStatus: row.payment_status,
      grandTotal: row.grand_total,
      createdAt: row.created_at,
    }));
  } else {
    rows = await listRows<OrderRow>("orders", { order: "created_at", ascending: false, limit: 80 });
  }
  const t = await getTranslations("admin");
  const locale = (await getLocale()) as AppLocale;
  return (
    <div>
      <h1 className="font-serif text-4xl">{t("orders")}</h1>
      <form className="mt-6">
        <input name="q" defaultValue={query} placeholder={t("searchOrders")} className="w-full max-w-md rounded-md border border-line px-3 py-2" />
      </form>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="text-mute">
            <th className="py-2">{t("number")}</th>
            <th>{t("email")}</th>
            <th>{t("status")}</th>
            <th>{t("payment")}</th>
            <th>{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((order) => (
            <tr key={order.id} className="border-t border-line">
              <td className="py-2">
                <Link href={`/admin/comenzi/${order.id}`} className="underline">
                  {order.publicOrderNumber}
                </Link>
              </td>
              <td>{order.email}</td>
              <td>
                {orderStatusLabel(order.status, locale)}
                {order.createdAt ? (
                  <span className="mt-0.5 block text-xs text-mute">{formatDate(order.createdAt, locale)}</span>
                ) : null}
              </td>
              <td>{paymentStatusLabel(order.paymentStatus, locale)}</td>
              <td>{formatRon(order.grandTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
