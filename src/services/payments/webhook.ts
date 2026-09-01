import "server-only";
import { sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { getPaymentAdapter } from "@/services/payments";
import { PaymentError, type NormalizedWebhookEvent, type PaymentProviderKey } from "@/services/payments/types";
import { convertReservationToSale } from "@/services/inventory";
import { enqueueEmail } from "@/services/email";
import { recordOrderStatusChange } from "@/services/order-status";
import { writeAudit } from "@/server/audit";
import { logger } from "@/lib/logger";

type PaymentRow = {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  order: { status: string; paymentStatus: string; currency: string; email: string; publicOrderNumber: string; grandTotal: number };
};

export async function handlePaymentWebhook(rawBody: string, signature: string | null) {
  const adapter = getPaymentAdapter();
  let event;
  try {
    event = await adapter.parseWebhook(rawBody, signature);
  } catch (error) {
    logger.warn("webhook.invalid_signature");
    throw error instanceof PaymentError ? error : new PaymentError("Invalid webhook signature");
  }

  const { data: existing } = await sb()
    .from("payment_events")
    .select("id, processed_at")
    .eq("provider", adapter.key)
    .eq("provider_event_id", event.providerEventId)
    .maybeSingle();
  if (existing?.processed_at) {
    return { ok: true, duplicate: true };
  }

  if (!existing) {
    await sb().from("payment_events").upsert(
      {
        provider: adapter.key,
        provider_event_id: event.providerEventId,
        type: event.type,
        payload_hash: event.rawHash,
        result: "received",
      },
      { onConflict: "provider,provider_event_id", ignoreDuplicates: true },
    );
  }

  const { data: locked } = await sb()
    .from("payment_events")
    .select("id, processed_at")
    .eq("provider", adapter.key)
    .eq("provider_event_id", event.providerEventId)
    .maybeSingle();
  if (locked?.processed_at) {
    return { ok: true, duplicate: true };
  }

  if (event.refunded) {
    const payment = await findPayment(adapter.key, event);
    if (!payment) {
      await markEvent(adapter.key, event.providerEventId, "ignored");
      return { ok: true, ignored: true };
    }
    if (payment.status === "REFUNDED" || payment.order.paymentStatus === "REFUNDED") {
      await markEvent(adapter.key, event.providerEventId, "already_refunded", payment.id);
      return { ok: true, duplicate: true };
    }
    if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
      await markEvent(adapter.key, event.providerEventId, "ignored", payment.id);
      return { ok: true, ignored: true };
    }
    await sb().from("payments").update({ status: "REFUNDED", updated_at: new Date().toISOString() }).eq("id", payment.id);
    await sb()
      .from("orders")
      .update({ status: "REFUNDED", payment_status: "REFUNDED", updated_at: new Date().toISOString() })
      .eq("id", payment.orderId);
    await markEvent(adapter.key, event.providerEventId, "refunded", payment.id);
    return { ok: true, refunded: true };
  }

  if (event.failed) {
    const payment = await findPayment(adapter.key, event);
    if (!payment) {
      await markEvent(adapter.key, event.providerEventId, "ignored");
      return { ok: true, ignored: true };
    }
    if (payment.status === "PAID") {
      await markEvent(adapter.key, event.providerEventId, "already_paid", payment.id);
      return { ok: true, duplicate: true };
    }
    await sb().from("payments").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("id", payment.id);
    await sb().from("orders").update({ payment_status: "FAILED", updated_at: new Date().toISOString() }).eq("id", payment.orderId);
    await markEvent(adapter.key, event.providerEventId, "failed", payment.id);
    return { ok: true, failed: true };
  }

  if (!event.paid) {
    await markEvent(adapter.key, event.providerEventId, "ignored");
    return { ok: true, ignored: true };
  }

  const payment = await findPayment(adapter.key, event);
  if (!payment) throw new PaymentError("Payment not found");

  if (payment.status === "PAID") {
    try {
      await convertReservationToSale(payment.orderId);
    } catch {
      logger.warn("webhook.sale_already_confirmed", { orderId: payment.orderId });
    }
    await sb()
      .from("payment_events")
      .update({ payment_id: payment.id, processed_at: new Date().toISOString(), result: "already_paid" })
      .eq("provider", adapter.key)
      .eq("provider_event_id", event.providerEventId);
    return { ok: true, duplicate: true };
  }
  if (event.amount != null && event.amount !== payment.amount) {
    logger.error("webhook.amount_mismatch", { orderId: payment.orderId });
    throw new PaymentError("Amount mismatch");
  }
  if (payment.order.currency && event.amount != null && payment.currency !== payment.order.currency) {
    throw new PaymentError("Currency mismatch");
  }

  const paidAt = new Date().toISOString();
  const { data: claimed } = await sb()
    .from("payments")
    .update({ status: "PAID", updated_at: paidAt })
    .eq("id", payment.id)
    .eq("status", "PENDING")
    .select("id")
    .maybeSingle();
  if (!claimed) {
    try {
      await convertReservationToSale(payment.orderId);
    } catch {
      logger.warn("webhook.sale_already_confirmed", { orderId: payment.orderId });
    }
    await markEvent(adapter.key, event.providerEventId, "already_paid", payment.id);
    return { ok: true, duplicate: true };
  }
  if (event.paymentIntentId) {
    await sb()
      .from("payments")
      .update({ provider_payment_intent_id: event.paymentIntentId, paid_at: paidAt })
      .eq("id", payment.id);
  } else {
    await sb().from("payments").update({ paid_at: paidAt }).eq("id", payment.id);
  }
  await sb()
    .from("orders")
    .update({
      status: "PAID",
      payment_status: "PAID",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.orderId);
  await recordOrderStatusChange({
    orderId: payment.orderId,
    fromStatus: payment.order.status,
    toStatus: "PAID",
    note: "webhook",
  });
  try {
    await convertReservationToSale(payment.orderId);
  } catch {
    logger.error("webhook.stock_convert_failed", { orderId: payment.orderId });
  }
  await sb()
    .from("payment_events")
    .update({ payment_id: payment.id, processed_at: new Date().toISOString(), result: "paid" })
    .eq("provider", adapter.key)
    .eq("provider_event_id", event.providerEventId);

  await enqueueEmail(payment.order.email, "payment_confirmed", {
    orderNumber: payment.order.publicOrderNumber,
    total: payment.order.grandTotal,
  });
  await writeAudit({
    action: "payment.confirmed",
    entityType: "Order",
    entityId: payment.orderId,
    after: { providerEventId: event.providerEventId },
  });
  return { ok: true };
}

async function markEvent(provider: PaymentProviderKey, eventId: string, result: string, paymentId?: string) {
  await sb()
    .from("payment_events")
    .update({
      processed_at: new Date().toISOString(),
      result,
      ...(paymentId ? { payment_id: paymentId } : {}),
    })
    .eq("provider", provider)
    .eq("provider_event_id", eventId);
}

async function findPayment(provider: PaymentProviderKey, event: NormalizedWebhookEvent): Promise<PaymentRow | null> {
  const select = "*, order:orders(status, payment_status, currency, email, public_order_number, grand_total)";
  const bySession = await sb().from("payments").select(select).eq("provider", provider).eq("provider_payment_id", event.providerPaymentId).maybeSingle();
  if (bySession.data) return camelKeys<PaymentRow>(bySession.data);
  if (event.paymentIntentId) {
    const byIntent = await sb().from("payments").select(select).eq("provider", provider).eq("provider_payment_intent_id", event.paymentIntentId).maybeSingle();
    if (!byIntent.error && byIntent.data) return camelKeys<PaymentRow>(byIntent.data);
  }
  if (event.orderId) {
    const byOrder = await sb().from("payments").select(select).eq("provider", provider).eq("order_id", event.orderId).maybeSingle();
    if (byOrder.data) return camelKeys<PaymentRow>(byOrder.data);
  }
  return null;
}
