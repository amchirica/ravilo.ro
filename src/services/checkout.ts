import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { randomToken, sha256 } from "@/lib/crypto";
import { z } from "zod";
import { checkoutSchema } from "@/schemas/commerce";
import { PaymentError } from "@/services/payments/types";
import { getCurrentUser } from "@/server/auth/session";
import { writeAudit } from "@/server/audit";
import { clientContext } from "@/server/http";
import { getExistingCart, clearCart } from "@/services/cart";
import { quoteCart } from "@/services/pricing";
import { getStoreSettings } from "@/services/settings";
import { InventoryError, defaultLocationId, releaseReservationsForOrder, reserveStock } from "@/services/inventory";
import { getPaymentAdapter } from "@/services/payments";
import { stripeLineItemsFromQuote, stripeLinesTotal } from "@/services/payments/stripe-line-items";
import { enqueueEmail } from "@/services/email";
import { getEnv } from "@/lib/env";
import { checkoutHoldSeconds } from "@/lib/checkout-hold";
import { getLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type OrderRow = {
  id: string;
  publicOrderNumber: string;
  grandTotal: number;
  currency: string;
  email: string;
};

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

export async function createCheckout(input: unknown) {
  if (!isSupabaseConfigured()) throw new CheckoutError("Supabase nu este configurat.");
  assertPaymentReady();
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) throw new CheckoutError(describeCheckoutValidation(parsed.error));
  const data = parsed.data;
  const user = await getCurrentUser();
  const cart = await getExistingCart();
  if (!cart) throw new CheckoutError("Coșul este gol sau invalid.");
  const { data: rawItems } = await sb().from("cart_items").select("*").eq("cart_id", cart.id);
  const items = camelList<{ variantId: string; quantity: number }>(rawItems);
  if (!items.length) throw new CheckoutError("Coșul este gol sau invalid.");
  let quote;
  try {
    quote = await quoteCart({
      items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      shippingMethodId: data.shippingMethodId,
      discountCode: data.discountCode,
      profileId: user?.id,
    });
  } catch (error) {
    throw new CheckoutError(error instanceof Error ? error.message : "Coșul nu a putut fi recalculat.");
  }
  if (data.discountCode && data.discountCode.trim() && !quote.discountCode) {
    throw new CheckoutError("Codul de reducere nu este valid.");
  }
  if (!quote.shippingMethod) {
    throw new CheckoutError("Metoda de livrare nu este disponibilă. Adaugă o metodă activă în Admin → Livrare.");
  }
  const snapshots = (input as { displayedUnitPrices?: Record<string, number> }).displayedUnitPrices;
  if (snapshots) {
    for (const line of quote.lines) {
      const shown = snapshots[line.variantId];
      if (typeof shown === "number" && shown !== line.unitPrice) {
        throw new CheckoutError(`Prețul produsului ${line.productName} s-a modificat.`);
      }
    }
  }
  const settings = await getStoreSettings();
  const locationId = await defaultLocationId();
  const confirmationToken = randomToken(32);
  const checkoutToken = randomToken(32);
  const billing = data.sameAsShipping ? data.shipping : (data.billing ?? data.shipping);
  const { ipHash, userAgent } = await clientContext();
  const expiresAt = new Date(Date.now() + checkoutHoldSeconds(settings.reservationMinutes) * 1000);

  const { data: seq, error: seqError } = await sb().rpc("next_order_number");
  if (seqError || seq == null) throw new CheckoutError("Nu am putut aloca numărul comenzii.");
  const publicOrderNumber = `${settings.orderNumberPrefix}-${String(seq).padStart(6, "0")}`;

  const { data: createdRaw, error: orderError } = await sb()
    .from("orders")
    .insert({
      public_order_number: publicOrderNumber,
      checkout_token_hash: sha256(checkoutToken),
      confirmation_token_hash: sha256(confirmationToken),
      profile_id: user?.id ?? null,
      email: data.email,
      phone: data.phone,
      status: "PENDING_PAYMENT",
      payment_status: "PENDING",
      currency: quote.currency,
      subtotal: quote.subtotal,
      discount_total: quote.discountTotal,
      shipping_total: quote.shippingTotal,
      tax_total: quote.taxTotal,
      grand_total: quote.grandTotal,
      discount_code: quote.discountCode,
      tax_rate_bps_snapshot: quote.taxRateBps,
      prices_include_tax: quote.pricesIncludeTax,
      shipping_method_snapshot: quote.shippingMethod,
      billing_address_snapshot: billing,
      shipping_address_snapshot: data.shipping,
      customer_notes: data.customerNotes,
    })
    .select("*")
    .single();
  if (orderError || !createdRaw) throw new CheckoutError(orderError?.message ?? "Nu am putut crea comanda.");
  const created = camelKeys<OrderRow>(createdRaw);

  const { error: itemsError } = await sb().from("order_items").insert(
    quote.lines.map((line) => ({
      order_id: created.id,
      product_id: line.productId,
      variant_id: line.variantId,
      sku: line.sku,
      product_name: line.productName,
      variant_name: line.variantName,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      discount: 0,
      tax: line.tax,
      line_total: line.lineTotal,
    })),
  );
  if (itemsError) throw new CheckoutError(itemsError.message);

  await sb().from("order_status_history").insert({
    order_id: created.id,
    to: "PENDING_PAYMENT",
    note: "checkout",
  });

  try {
    for (const line of quote.lines) {
      const { data: variant } = await sb()
        .from("product_variants")
        .select("id, product:products(allow_backorder)")
        .eq("id", line.variantId)
        .maybeSingle();
      const product = variant?.product as { allow_backorder?: boolean } | { allow_backorder?: boolean }[] | null;
      const allowBackorder = Array.isArray(product) ? Boolean(product[0]?.allow_backorder) : Boolean(product?.allow_backorder);
      try {
        await reserveStock({
          variantId: line.variantId,
          locationId,
          quantity: line.quantity,
          orderId: created.id,
          actorUserId: user?.id,
          expiresAt,
          allowBackorder,
        });
      } catch {
        await abortPendingCheckout(created.id);
        throw new CheckoutError(`Produsul ${line.productName} nu mai este disponibil în cantitatea selectată.`);
      }
    }
  } catch (error) {
    if (error instanceof CheckoutError) throw error;
    await abortPendingCheckout(created.id);
    throw error instanceof InventoryError
      ? new CheckoutError(error.message)
      : new CheckoutError("Produsul nu mai este disponibil în cantitatea selectată.");
  }

  if (quote.discountCode) {
    const { data: discount } = await sb().from("discounts").select("id").eq("code", quote.discountCode).maybeSingle();
    if (discount) {
      await sb().from("discount_redemptions").insert({
        discount_id: discount.id,
        profile_id: user?.id ?? null,
        order_id: created.id,
      });
    }
  }
  if (data.marketingConsent && user) {
    await sb()
      .from("profiles")
      .update({ marketing_consent: true, marketing_consent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", user.id);
    await sb().from("consent_records").insert({
      profile_id: user.id,
      category: "MARKETING",
      granted: true,
      source: "checkout",
      version: "v1",
    });
  }

  await writeAudit({
    actorUserId: user?.id,
    action: "order.create",
    entityType: "Order",
    entityId: created.id,
    after: { publicOrderNumber: created.publicOrderNumber, grandTotal: created.grandTotal },
    ipHash,
    userAgent,
  });

  const adapter = getPaymentAdapter();
  const appUrl = getEnv().APP_URL.replace(/\/$/, "");
  const locale = await getLocale();
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const lineItems = stripeLineItemsFromQuote({
    currency: quote.currency,
    lines: quote.lines,
    discountTotal: quote.discountTotal,
    shippingTotal: quote.shippingTotal,
    shippingMethodName: quote.shippingMethod?.name,
    taxTotal: quote.taxTotal,
    pricesIncludeTax: quote.pricesIncludeTax,
    grandTotal: quote.grandTotal,
  });
  if (stripeLinesTotal(lineItems) !== created.grandTotal) {
    await abortPendingCheckout(created.id);
    throw new CheckoutError("Totalul Stripe nu coincide cu totalul comenzii.");
  }
  const { error: paymentInsertError } = await sb().from("payments").insert({
    order_id: created.id,
    provider: adapter.key,
    provider_payment_id: `pending_${created.id}`,
    amount: created.grandTotal,
    currency: created.currency,
    status: "PENDING",
  });
  if (paymentInsertError) {
    await abortPendingCheckout(created.id);
    throw new CheckoutError("Nu am putut înregistra plata.");
  }
  let session;
  try {
    session = await adapter.createCheckout({
      orderId: created.id,
      publicOrderNumber: created.publicOrderNumber,
      amount: created.grandTotal,
      currency: created.currency,
      customerEmail: created.email,
      locale,
      expiresAt,
      successUrl: `${appUrl}${localePrefix}/checkout/succes?token=${confirmationToken}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}${localePrefix}/checkout/anulat?session_id={CHECKOUT_SESSION_ID}`,
      lineItems,
    });
  } catch (error) {
    await abortPendingCheckout(created.id);
    throw toCheckoutPaymentError(error);
  }
  await sb()
    .from("payments")
    .update({ provider_payment_id: session.providerPaymentId, updated_at: new Date().toISOString() })
    .eq("order_id", created.id)
    .eq("provider_payment_id", `pending_${created.id}`);

  await enqueueEmail(created.email, "order_received", {
    orderNumber: created.publicOrderNumber,
    firstName: data.shipping.firstName,
  });
  await clearCart(cart.id);
  return { redirectUrl: session.redirectUrl, confirmationToken, orderId: created.id };
}

async function abortPendingCheckout(orderId: string) {
  await releaseReservationsForOrder(orderId);
  await sb()
    .from("orders")
    .update({ status: "CANCELLED", payment_status: "FAILED", cancelled_at: new Date().toISOString() })
    .eq("id", orderId);
}

function assertPaymentReady() {
  try {
    getPaymentAdapter();
  } catch (error) {
    throw toCheckoutPaymentError(error);
  }
}

function toCheckoutPaymentError(error: unknown): CheckoutError {
  if (error instanceof CheckoutError) return error;
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Live Stripe key")) {
    return new CheckoutError(
      "Cheia Stripe live nu poate fi folosită pe localhost. În .env.local pune o cheie de test (sk_test_...) din Stripe Dashboard → Developers → API keys, cu Test mode pornit.",
    );
  }
  if (error instanceof PaymentError && message.includes("not configured")) {
    return new CheckoutError("Stripe nu este configurat. Adaugă STRIPE_SECRET_KEY (sk_test_) în .env.local.");
  }
  return new CheckoutError(message || "Nu am putut deschide plata.");
}

const CHECKOUT_FIELD_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Telefon",
  shippingMethodId: "Metoda de livrare",
  discountCode: "Cod reducere",
  "shipping.firstName": "Prenume",
  "shipping.lastName": "Nume",
  "shipping.county": "Județ",
  "shipping.city": "Oraș",
  "shipping.street": "Stradă",
  "shipping.number": "Număr",
  "shipping.postalCode": "Cod poștal",
  "shipping.country": "Țară",
  "shipping.phone": "Telefon livrare",
};

function describeCheckoutValidation(error: z.ZodError) {
  const issue = error.issues[0];
  const path = issue?.path.join(".") ?? "";
  const label = CHECKOUT_FIELD_LABELS[path] ?? path;
  if (path === "email") return "Adresa de email nu este validă.";
  if (path === "shipping.country") return "Țara trebuie să fie codul ISO de 2 litere, de exemplu RO.";
  if (path === "shipping.postalCode") return "Codul poștal trebuie să aibă cel puțin 4 caractere.";
  if (path === "phone" || path === "shipping.phone") return "Telefonul trebuie să aibă cel puțin 8 cifre.";
  return label ? `Verifică câmpul ${label}.` : "Completează corect datele de checkout.";
}
