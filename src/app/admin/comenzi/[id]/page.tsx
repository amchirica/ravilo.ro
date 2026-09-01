import { requirePermission } from "@/server/auth/session";
import { hasPermission } from "@/server/rbac";
import { sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { formatRon } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { writeAudit } from "@/server/audit";
import { enqueueEmail } from "@/services/email";
import { fulfillmentStatusFor, recordOrderStatusChange } from "@/services/order-status";
import { getPaymentAdapter } from "@/services/payments";
import { canTransitionOrder, nextFulfillmentStatuses, ORDER_STATUSES, type OrderStatus } from "@/types/domain";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { CopyText } from "@/components/admin/copy-text";
import { Button, Field, Textarea } from "@/components/ui/primitives";
import { getEnv } from "@/lib/env";
import { orderActionLabel, orderStatusLabel, paymentStatusLabel } from "@/lib/order-status";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OrderItemRow = {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  lineTotal: number;
  unitPrice: number;
  sku: string;
};

type PaymentRow = {
  id: string;
  status: string;
  provider: string;
  providerPaymentId: string;
  providerPaymentIntentId?: string | null;
  amount: number;
  currency: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
};

type HistoryRow = {
  id: string;
  createdAt: Date | string;
  fromStatus: string | null;
  toStatus: string;
  note: string;
};

type OrderRow = {
  id: string;
  publicOrderNumber: string;
  email: string;
  phone: string;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  discountCode: string | null;
  pricesIncludeTax: boolean;
  customerNotes: string;
  adminNotes: string;
  shippingAddressSnapshot: unknown;
  billingAddressSnapshot: unknown;
  shippingMethodSnapshot: unknown;
  paidAt: Date | string | null;
  cancelledAt: Date | string | null;
  fulfilledAt: Date | string | null;
  createdAt: Date | string;
};

type AddressSnap = {
  firstName?: string;
  lastName?: string;
  company?: string;
  cui?: string;
  phone?: string;
  street?: string;
  number?: string;
  building?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  postalCode?: string;
  city?: string;
  county?: string;
  country?: string;
};

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const actor = await requirePermission("order.read");
  const { id: rawId } = await params;
  const { e } = await searchParams;
  const id = await resolveOrderId(rawId);
  if (!id) notFound();

  const { data, error } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
  if (error || !data) notFound();
  const order = camelKeys<OrderRow>(data);

  const [{ data: itemsRaw }, { data: paymentsRaw }, { data: historyRaw }] = await Promise.all([
    sb().from("order_items").select("*").eq("order_id", id).order("product_name"),
    sb().from("payments").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    sb().from("order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true }),
  ]);

  const items = camelList<OrderItemRow>(itemsRaw);
  const payments = camelList<PaymentRow>(paymentsRaw);
  const history = camelList<HistoryRow>(historyRaw);
  const payment = payments.find((row) => row.status === "PAID") ?? payments[0];
  const locale = (await getLocale()) as AppLocale;
  const nextStatuses = nextFulfillmentStatuses(order.status);
  const canWrite = hasPermission(actor.role, "order.write");
  const canRefund = hasPermission(actor.role, "order.refund");
  const testMode = stripeIsTestMode();
  const stripeHref = stripeDashboardUrl(
    payment?.provider,
    payment?.providerPaymentId,
    payment?.providerPaymentIntentId,
    testMode,
  );
  const shippingText = formatAddress(order.shippingAddressSnapshot);
  const billingText = formatAddress(order.billingAddressSnapshot);
  const method = shippingMethodLabel(order.shippingMethodSnapshot, locale);
  const errorFlash =
    e === "transition"
      ? locale === "en"
        ? "That status change is not allowed from the current state."
        : "Această schimbare de status nu este permisă din starea actuală."
      : e === "save"
        ? locale === "en"
          ? "Could not save. Try again."
          : "Nu am putut salva. Încearcă din nou."
        : null;
  const okFlash =
    e === "saved" ? (locale === "en" ? "Notes saved." : "Notițele au fost salvate.") : null;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/comenzi" className="text-xs uppercase tracking-[0.16em] text-mute">
        ← {locale === "en" ? "Orders" : "Comenzi"}
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">{order.publicOrderNumber}</h1>
          <p className="mt-2 text-sm text-mute">{formatDateTime(order.createdAt, locale)}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{orderStatusLabel(order.status, locale)}</p>
          <p className="text-mute">{paymentStatusLabel(order.paymentStatus, locale)}</p>
        </div>
      </div>
      {errorFlash ? <p className="mt-4 text-sm text-warning">{errorFlash}</p> : null}
      {okFlash ? <p className="mt-4 text-sm">{okFlash}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section className="border border-line bg-card p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-mute">{locale === "en" ? "Customer" : "Client"}</p>
          <p className="mt-3">
            <a className="underline" href={`mailto:${order.email}`}>
              {order.email}
            </a>
          </p>
          <p className="mt-1">
            <a className="underline" href={`tel:${order.phone}`}>
              {order.phone}
            </a>
          </p>
          {order.customerNotes?.trim() ? (
            <p className="mt-4 whitespace-pre-wrap rounded-md bg-cream/60 p-3">
              <span className="block text-xs uppercase tracking-[0.14em] text-mute">
                {locale === "en" ? "Customer note" : "Notă client"}
              </span>
              {order.customerNotes}
            </p>
          ) : null}
        </section>
        <section className="border border-line bg-card p-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-mute">{locale === "en" ? "Ship to" : "Livrare"}</p>
            <CopyText text={shippingText} label={locale === "en" ? "Copy address" : "Copiază adresa"} />
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans">{shippingText || "—"}</pre>
          {method ? <p className="mt-3 text-mute">{method}</p> : null}
        </section>
      </div>

      {billingText && billingText !== shippingText ? (
        <section className="mt-4 border border-line bg-card p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-mute">{locale === "en" ? "Billing" : "Facturare"}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans">{billingText}</pre>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-2xl">{locale === "en" ? "Items" : "Produse"}</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-mute">{locale === "en" ? "No line items." : "Niciun produs pe comandă."}</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-mute">
                <th className="py-2">{locale === "en" ? "Product" : "Produs"}</th>
                <th>SKU</th>
                <th>{locale === "en" ? "Qty" : "Cant."}</th>
                <th className="text-right">{locale === "en" ? "Line" : "Linie"}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="py-2">
                    {item.productName}
                    {item.variantName ? ` · ${item.variantName}` : ""}
                  </td>
                  <td className="text-mute">{item.sku}</td>
                  <td>{item.quantity}</td>
                  <td className="text-right">{formatRon(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-mute">{locale === "en" ? "Subtotal" : "Subtotal"}</dt>
            <dd>{formatRon(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 ? (
            <div className="flex justify-between gap-6">
              <dt className="text-mute">
                {locale === "en" ? "Discount" : "Reducere"}
                {order.discountCode ? ` (${order.discountCode})` : ""}
              </dt>
              <dd>−{formatRon(order.discountTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-6">
            <dt className="text-mute">{locale === "en" ? "Shipping" : "Livrare"}</dt>
            <dd>{formatRon(order.shippingTotal)}</dd>
          </div>
          {order.taxTotal > 0 && !order.pricesIncludeTax ? (
            <div className="flex justify-between gap-6">
              <dt className="text-mute">TVA</dt>
              <dd>{formatRon(order.taxTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-6 font-medium">
            <dt>{locale === "en" ? "Total" : "Total"}</dt>
            <dd>{formatRon(order.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      {payment ? (
        <section className="mt-8 border border-line bg-card p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-mute">{locale === "en" ? "Payment" : "Plată"}</p>
          <p className="mt-3">
            {payment.provider} · {paymentStatusLabel(payment.status, locale)} · {formatRon(payment.amount)}
          </p>
          {order.paidAt ? (
            <p className="mt-1 text-mute">
              {locale === "en" ? "Paid" : "Plătită"} {formatDateTime(order.paidAt, locale)}
            </p>
          ) : null}
          <p className="mt-1 break-all text-mute">{payment.providerPaymentId}</p>
          {stripeHref ? (
            <p className="mt-2">
              <a href={stripeHref} className="underline" rel="noopener noreferrer" target="_blank">
                Stripe Dashboard
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      {canWrite ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">{locale === "en" ? "Fulfillment" : "Pregătire și livrare"}</h2>
          <p className="mt-2 text-sm text-mute">
            {locale === "en" ? "Current status:" : "Status actual:"} {orderStatusLabel(order.status, locale)}
          </p>
          {nextStatuses.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextStatuses.map((status) => {
                const label = orderActionLabel(status, locale);
                const confirm =
                  status === "CANCELLED"
                    ? locale === "en"
                      ? "Cancel this order? The customer will get an email."
                      : "Anulezi comanda? Clientul va primi un email."
                    : status === "SHIPPED"
                      ? locale === "en"
                        ? "Mark as shipped? The customer will get an email."
                        : "Marchezi comanda ca expediată? Clientul va primi un email."
                      : null;
                const button = (
                  <Button type="submit" variant={status === "CANCELLED" ? "line" : "solid"}>
                    {label}
                  </Button>
                );
                if (confirm) {
                  return (
                    <ConfirmForm key={status} action={updateStatus.bind(null, order.id)} message={confirm}>
                      <input type="hidden" name="status" value={status} />
                      {button}
                    </ConfirmForm>
                  );
                }
                return (
                  <form key={status} action={updateStatus.bind(null, order.id)}>
                    <input type="hidden" name="status" value={status} />
                    {button}
                  </form>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-mute">
              {locale === "en" ? "No further status changes from here." : "Nu mai urmează pași de status din această stare."}
            </p>
          )}
        </section>
      ) : null}

      {canRefund && order.paymentStatus === "PAID" ? (
        <div className="mt-4">
          <ConfirmForm
            action={refundOrder.bind(null, order.id)}
            message={
              locale === "en"
                ? "Refund the full amount through Stripe?"
                : "Confirmi rambursarea integrală prin Stripe?"
            }
          >
            <Button type="submit" variant="line">
              {locale === "en" ? "Full refund" : "Rambursează integral"}
            </Button>
          </ConfirmForm>
        </div>
      ) : null}

      {canWrite ? (
        <form action={saveNotes.bind(null, order.id)} className="mt-10">
          <Field label={locale === "en" ? "Internal notes" : "Notițe interne"}>
            <Textarea name="adminNotes" defaultValue={order.adminNotes ?? ""} rows={5} />
          </Field>
          <Button type="submit" variant="line" className="mt-3">
            {locale === "en" ? "Save notes" : "Salvează notițele"}
          </Button>
        </form>
      ) : order.adminNotes?.trim() ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">{locale === "en" ? "Internal notes" : "Notițe interne"}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{order.adminNotes}</p>
        </section>
      ) : null}

      <h2 className="mt-10 font-serif text-2xl">{locale === "en" ? "History" : "Istoric"}</h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-mute">{locale === "en" ? "No status history yet." : "Încă nu există istoric de status."}</p>
      ) : (
        <ul className="mt-3 text-sm text-mute">
          {history.map((row) => (
            <li key={row.id}>
              {formatDateTime(row.createdAt, locale)} ·{" "}
              {row.fromStatus ? orderStatusLabel(row.fromStatus, locale) : "—"} → {orderStatusLabel(row.toStatus, locale)}
              {row.note ? ` · ${row.note}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function resolveOrderId(raw: string) {
  const id = raw.trim();
  if (UUID_RE.test(id)) return id;
  const { data } = await sb()
    .from("orders")
    .select("id")
    .ilike("public_order_number", id.slice(0, 40))
    .maybeSingle();
  if (data?.id) redirect(`/admin/comenzi/${data.id}`);
  return null;
}

async function updateStatus(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("order.write");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    redirect(`/admin/comenzi/${id}?e=transition`);
  }
  const { data } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
  if (!data) return;
  const existing = camelKeys<OrderRow>(data);
  if (existing.status === status) {
    redirect(`/admin/comenzi/${id}`);
  }
  if (!canTransitionOrder(existing.status, status)) {
    redirect(`/admin/comenzi/${id}?e=transition`);
  }
  const now = new Date().toISOString();
  const { error } = await sb()
    .from("orders")
    .update({
      status,
      fulfillment_status: fulfillmentStatusFor(status, existing.fulfillmentStatus),
      fulfilled_at:
        status === "SHIPPED" || status === "DELIVERED"
          ? now
          : isoOrNull(existing.fulfilledAt),
      cancelled_at: status === "CANCELLED" ? now : isoOrNull(existing.cancelledAt),
      updated_at: now,
    })
    .eq("id", id);
  if (error) redirect(`/admin/comenzi/${id}?e=save`);
  await recordOrderStatusChange({
    orderId: id,
    fromStatus: existing.status,
    toStatus: status,
    actorId: actor.id,
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
  if (status === "DELIVERED") await enqueueEmail(existing.email, "order_delivered", { orderNumber: existing.publicOrderNumber });
  if (status === "CANCELLED") await enqueueEmail(existing.email, "order_cancelled", { orderNumber: existing.publicOrderNumber });
  revalidatePath(`/admin/comenzi/${id}`);
  revalidatePath("/admin/comenzi");
  redirect(`/admin/comenzi/${id}`);
}

async function saveNotes(id: string, formData: FormData) {
  "use server";
  const actor = await requirePermission("order.write");
  const adminNotes = String(formData.get("adminNotes") ?? "").slice(0, 4000);
  const { error } = await sb()
    .from("orders")
    .update({ admin_notes: adminNotes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) redirect(`/admin/comenzi/${id}?e=save`);
  await writeAudit({
    actorUserId: actor.id,
    action: "order.notes",
    entityType: "Order",
    entityId: id,
    after: { adminNotes: adminNotes.slice(0, 200) },
  });
  revalidatePath(`/admin/comenzi/${id}`);
  redirect(`/admin/comenzi/${id}?e=saved`);
}

async function refundOrder(id: string) {
  "use server";
  const actor = await requirePermission("order.refund");
  const { data } = await sb().from("orders").select("*").eq("id", id).maybeSingle();
  if (!data) return;
  const order = camelKeys<OrderRow>(data);
  if (order.paymentStatus !== "PAID") return;
  const { data: paymentsRaw } = await sb().from("payments").select("*").eq("order_id", id);
  const payments = camelList<PaymentRow>(paymentsRaw);
  const payment = payments.find((row) => row.status === "PAID");
  if (!payment) return;
  const adapter = getPaymentAdapter();
  await adapter.refund({ providerPaymentId: payment.providerPaymentId, amount: payment.amount });
  await sb().from("payments").update({ status: "REFUNDED", updated_at: new Date().toISOString() }).eq("id", payment.id);
  await sb()
    .from("orders")
    .update({ status: "REFUNDED", payment_status: "REFUNDED", updated_at: new Date().toISOString() })
    .eq("id", id);
  await recordOrderStatusChange({
    orderId: id,
    fromStatus: order.status,
    toStatus: "REFUNDED",
    actorId: actor.id,
    note: "refund",
  });
  await writeAudit({
    actorUserId: actor.id,
    action: "order.refund",
    entityType: "Order",
    entityId: id,
    after: { amount: payment.amount },
  });
  await enqueueEmail(order.email, "order_refund", { orderNumber: order.publicOrderNumber });
  revalidatePath(`/admin/comenzi/${id}`);
  revalidatePath("/admin/comenzi");
  redirect(`/admin/comenzi/${id}`);
}

function stripeIsTestMode() {
  try {
    return (getEnv().STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  } catch {
    return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
  }
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

function isoOrNull(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  return value;
}

function formatAddress(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const raw = value as Record<string, unknown>;
  const a: AddressSnap = {
    firstName: str(raw.firstName ?? raw.first_name),
    lastName: str(raw.lastName ?? raw.last_name),
    company: str(raw.company),
    cui: str(raw.cui),
    phone: str(raw.phone),
    street: str(raw.street),
    number: str(raw.number),
    building: str(raw.building),
    entrance: str(raw.entrance),
    floor: str(raw.floor),
    apartment: str(raw.apartment),
    postalCode: str(raw.postalCode ?? raw.postal_code),
    city: str(raw.city),
    county: str(raw.county),
    country: str(raw.country),
  };
  const name = [a.firstName, a.lastName].filter(Boolean).join(" ");
  const street = [a.street, a.number].filter(Boolean).join(" ");
  const extra = [
    a.building ? `bl. ${a.building}` : "",
    a.entrance ? `sc. ${a.entrance}` : "",
    a.floor ? `et. ${a.floor}` : "",
    a.apartment ? `ap. ${a.apartment}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const cityLine = [a.postalCode, a.city, a.county].filter(Boolean).join(" ");
  return [name, a.company, a.cui ? `CUI ${a.cui}` : "", street, extra, cityLine, a.country && a.country !== "RO" ? a.country : "", a.phone]
    .filter(Boolean)
    .join("\n");
}

function shippingMethodLabel(value: unknown, locale: AppLocale) {
  if (!value || typeof value !== "object") return "";
  const raw = value as Record<string, unknown>;
  const name = str(raw.name);
  const price = typeof raw.price === "number" ? raw.price : Number(raw.price);
  if (!name && !Number.isFinite(price)) return "";
  const priceText = Number.isInteger(price) && price >= 0 ? formatRon(price) : "";
  if (name && priceText) return `${locale === "en" ? "Method" : "Metodă"}: ${name} · ${priceText}`;
  return name || priceText;
}

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
