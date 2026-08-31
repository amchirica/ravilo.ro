import { getCurrentUser } from "@/server/auth/session";
import { listRows } from "@/lib/supabase/db";
import { Button } from "@/components/ui/primitives";
import { logoutAction } from "@/server/actions";
import { redirect } from "next/navigation";
import { formatMoney, formatDate } from "@/lib/format";
import { Link } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";
import { orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { EmptyState } from "@/components/storefront/empty-state";
import { AccountShell } from "@/components/storefront/account-shell";

export default async function AccountPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("account");
  const tSearch = await getTranslations("search");
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/cont");
  const rows = await listRows<{
    id: string;
    publicOrderNumber: string;
    status: string;
    paymentStatus: string;
    grandTotal: number;
    createdAt: Date | string;
  }>("orders", { eq: ["profile_id", user.id], order: "created_at", ascending: false, limit: 10 });
  return (
    <AccountShell
      title={t("title")}
      current="orders"
      actions={
        <form action={logoutAction}>
          <Button type="submit" variant="line">
            {t("logout")}
          </Button>
        </form>
      }
    >
      <p className="mb-8 text-sm text-mute">
        {user.firstName} {user.lastName} · {user.email}
      </p>
      {rows.length === 0 ? (
        <EmptyState title={t("emptyOrders")} hint={t("emptyOrdersHint")} actionHref="/produse" actionLabel={tSearch("discover")} />
      ) : (
        <ul>
          {rows.map((order) => (
            <li key={order.id} className="grid gap-2 border-t border-line py-5 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-6">
              <div>
                <p className="tracking-[-0.02em]">{order.publicOrderNumber}</p>
                <p className="mt-1 text-sm text-mute">
                  {formatDate(order.createdAt, locale)} · {orderStatusLabel(order.status, locale)} · {paymentStatusLabel(order.paymentStatus, locale)}
                </p>
              </div>
              <p className="text-sm">{formatMoney(order.grandTotal, locale)}</p>
              <Link
                href={`/urmareste-comanda?n=${encodeURIComponent(order.publicOrderNumber)}`}
                className="text-[0.6875rem] uppercase tracking-[0.14em] text-mute hover:text-ink"
              >
                {t("viewOrder")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
