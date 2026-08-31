import { requirePermission } from "@/server/auth/session";
import { sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { notFound, redirect } from "next/navigation";
import { formatRon } from "@/lib/money";
import { writeAudit } from "@/server/audit";
import { enqueueEmail } from "@/services/email";
import { getPaymentAdapter } from "@/services/payments";
import { canTransitionOrder, type OrderStatus } from "@/types/domain";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { Button } from "@/components/ui/primitives";
import { getEnv } from "@/lib/env";

type OrderRow = {
  id: string;
  publicOrderNumber: string;
  email: string;
  phone: string;
  status: OrderStatus;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  paidAt: Date | string | null;
  fulfilledAt: Date | null;
  items: { id: string; productName: string; variantName: string; quantity: number; lineTotal: number; unitPrice?: number; sku?: string }[];
  payments: {
    id: string;
    status: string;
    provider: string;
    providerPaymentId: string;
    providerPaymentIntentId?: string | null;
    amount: number;
    currency: string;
    updatedAt?: Date | string;
  }[];
};

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("order.read");
  const { id } = await params;
  const { data } = await sb()
    .from("orders")
    .select("*, items:order_items(*), payments(*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = camelKeys<OrderRow>(data);
  const payment = order.payments[0];
  const testMode = (getEnv().STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  const stripeHref = stripeDashboardUrl(payment?.provider, payment?.providerPaymentId, payment?.providerPaymentIntentId, testMode);
  const { data: historyRaw } = await sb().from("order_status_history").select("*").eq("order_id", id);
  const history = camelList<{ id: string; createdAt: Date; from: string | null; to: string }>(historyRaw);
  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-4xl">{order.publicOrderNumber}</h1>
      <p className="mt-2 text-sm text-mute">
        {order.email} · {order.phone} · {order.status} · {order.paymentStatus}
      </p>
      <ul className="mt-6 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.productName} {item.variantName} × {item.quantity} — {formatRon(item.lineTotal)}
          </li>
        ))}
      </ul>
      <p className="mt-4 font-serif text-3xl">{formatRon(order.grandTotal)}</p>
      {payment ? (
        <div className="mt-6 border border-line bg-card p-4 text-sm">
          <p>Provider: {payment.provider}</p>
          <p>Payment status: {payment.status}</p>
          <p>
            Amount: {formatRon(payment.amount)} {payment.currency}
          </p>
          <p className="break-all">Stripe session: {payment.providerPaymentId}</p>
          {payment.providerPaymentIntentId ? <p className="break-all">Payment intent: {payment.providerPaymentIntentId}</p> : null}
          {order.paidAt ? <p>Paid at: {String(order.paidAt)}</p> : null}
          {stripeHref ? (
            <p className="mt-2">
              <a href={stripeHref} className="underline" rel="noopener noreferrer" target="_blank">
                Stripe Dashboard
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
      <form action={updateStatus.bind(null, order.id)} className="mt-6 flex gap-2">
        <select name="status" defaultValue={order.status} className="rounded-md border border-line px-3 py-2">
          {["PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <Button type="submit">Actualizează status</Button>
      </form>
      {order.paymentStatus === "PAID" ? (
        <div className="mt-4">
          <ConfirmForm action={refundOrder.bind(null, order.id)} message="Confirmi rambursarea integrală prin Stripe?">
            <Button type="submit" variant="line">
              Rambursează integral
            </Button>
          </ConfirmForm>
        </div>
      ) : null}
      <h2 className="mt-10 font-serif text-2xl">Istoric</h2>
      <ul className="mt-3 text-sm text-mute">
        {history.map((row) => (
          <li key={row.id}>
            {row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)} · {row.from ?? "—"} → {row.to}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function updateStatus(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("order.write");
  const status = String(formData.get("status")) as OrderStatus;
  const { data } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
  if (!data) return;
  const existing = camelKeys<OrderRow>(data);
  if (!canTransitionOrder(existing.status, status)) {
    throw new Error("Tranziție de status invalidă");
  }
  await sb()
    .from("orders")
    .update({
      status,
      fulfilled_at:
        status === "SHIPPED" || status === "DELIVERED"
          ? new Date().toISOString()
          : existing.fulfilledAt instanceof Date
            ? existing.fulfilledAt.toISOString()
            : existing.fulfilledAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await sb().from("order_status_history").insert({
    order_id: id,
    from: existing.status,
    to: status,
    actor_id: actor.id,
  });
  await writeAudit({
    actorUserId: actor.id,
    action: "order.status",
    entityType: "Order",
    entityId: id,
    before: { status: existing.status },
    after: { status },
  });
  if (status === "PROCESSING") await enqueueEmail(existing.email, "order_processing", { orderNumber: existing.publicOrderNumber });
  if (status === "SHIPPED") await enqueueEmail(existing.email, "order_shipped", { orderNumber: existing.publicOrderNumber });
  if (status === "CANCELLED") await enqueueEmail(existing.email, "order_cancelled", { orderNumber: existing.publicOrderNumber });
  redirect(`/admin/comenzi/${id}`);
}

async function refundOrder(id: string) {
  "use server";
  const actor = await requirePermission("order.refund");
  const { data } = await sb().from("orders").select("*, payments(*)").eq("id", id).maybeSingle();
  if (!data) return;
  const order = camelKeys<OrderRow>(data);
  if (order.paymentStatus !== "PAID") return;
  const payment = order.payments.find((row) => row.status === "PAID");
  if (!payment) return;
  const adapter = getPaymentAdapter();
  await adapter.refund({ providerPaymentId: payment.providerPaymentId, amount: payment.amount });
  await sb().from("payments").update({ status: "REFUNDED", updated_at: new Date().toISOString() }).eq("id", payment.id);
  await sb().from("orders").update({ status: "REFUNDED", payment_status: "REFUNDED", updated_at: new Date().toISOString() }).eq("id", id);
  await sb().from("order_status_history").insert({
    order_id: id,
    from: order.status,
    to: "REFUNDED",
    actor_id: actor.id,
    note: "refund",
  });
  await writeAudit({ actorUserId: actor.id, action: "order.refund", entityType: "Order", entityId: id, after: { amount: payment.amount } });
  await enqueueEmail(order.email, "order_refund", { orderNumber: order.publicOrderNumber });
  redirect(`/admin/comenzi/${id}`);
}

function stripeDashboardUrl(
  provider: string | undefined,
  sessionId: string | undefined,
  intentId: string | null | undefined,
  testMode: boolean,
) {
  if (provider !== "STRIPE" || (!sessionId && !intentId)) return null;
  const base = `https://dashboard.stripe.com/${testMode ? "test/" : ""}`;
  if (intentId?.startsWith("pi_")) return `${base}payments/${encodeURIComponent(intentId)}`;
  if (sessionId?.startsWith("cs_")) return `${base}checkout/sessions/${encodeURIComponent(sessionId)}`;
  const ref = intentId || sessionId;
  return ref ? `${base}search?query=${encodeURIComponent(ref)}` : null;
}
