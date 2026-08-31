import "server-only";
import Stripe from "stripe";
import { getEnv } from "@/lib/env";
import { payloadHash } from "@/lib/crypto";
import { stripeLinesTotal } from "@/services/payments/stripe-line-items";
import { stripeLocale } from "@/lib/checkout-hold";
import {
  PaymentError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type NormalizedWebhookEvent,
  type PaymentAdapter,
  type RefundInput,
} from "@/services/payments/types";

export class StripeAdapter implements PaymentAdapter {
  readonly key = "STRIPE" as const;
  private client: Stripe;

  constructor() {
    const secret = getEnv().STRIPE_SECRET_KEY;
    if (!secret) throw new PaymentError("Stripe is not configured");
    this.client = new Stripe(secret);
  }

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const lineItems =
      input.lineItems && input.lineItems.length
        ? input.lineItems
        : [
            {
              quantity: 1,
              price_data: {
                currency: input.currency.toLowerCase(),
                unit_amount: input.amount,
                product_data: { name: `Comanda ${input.publicOrderNumber}` },
              },
            },
          ];
    const stripeTotal = stripeLinesTotal(lineItems);
    if (stripeTotal !== input.amount) {
      throw new PaymentError("Stripe line items do not match order total");
    }
    const session = await this.client.checkout.sessions.create({
      mode: "payment",
      locale: stripeLocale(input.locale ?? "ro"),
      customer_email: input.customerEmail,
      client_reference_id: input.orderId,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      allow_promotion_codes: false,
      expires_at: input.expiresAt ? Math.floor(input.expiresAt.getTime() / 1000) : undefined,
      metadata: { order_id: input.orderId, order_number: input.publicOrderNumber },
      payment_intent_data: {
        metadata: { order_id: input.orderId, order_number: input.publicOrderNumber },
      },
      line_items: lineItems,
    });
    if (!session.url) throw new PaymentError("Stripe session missing URL");
    return {
      provider: "STRIPE",
      providerPaymentId: session.id,
      redirectUrl: session.url,
    };
  }

  async refund(input: RefundInput) {
    const session = await this.client.checkout.sessions.retrieve(input.providerPaymentId);
    const paymentIntent = session.payment_intent;
    const pi = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
    if (!pi) throw new PaymentError("Missing payment intent for refund");
    const refund = await this.client.refunds.create({
      payment_intent: pi,
      amount: input.amount,
      reason: "requested_by_customer",
    });
    return { refundId: refund.id };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<NormalizedWebhookEvent> {
    const secret = getEnv().STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) throw new PaymentError("Invalid webhook signature");
    let event: Stripe.Event;
    try {
      event = this.client.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new PaymentError("Invalid webhook signature");
    }
    const paid =
      event.type === "checkout.session.async_payment_succeeded" ||
      (event.type === "checkout.session.completed" &&
        event.data.object.object === "checkout.session" &&
        (event.data.object as Stripe.Checkout.Session).payment_status === "paid");
    const failed = event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed";
    const refunded = event.type === "charge.refunded";
    let providerPaymentId = "";
    let paymentIntentId: string | null = null;
    let amount: number | null = null;
    let orderId: string | null = null;
    if (event.type.startsWith("checkout.session") && event.data.object.object === "checkout.session") {
      const session = event.data.object as Stripe.Checkout.Session;
      providerPaymentId = session.id;
      paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
      amount = session.amount_total;
      orderId = session.metadata?.order_id ?? session.client_reference_id;
    } else if (event.type.startsWith("payment_intent") && event.data.object.object === "payment_intent") {
      const intent = event.data.object as Stripe.PaymentIntent;
      paymentIntentId = intent.id;
      providerPaymentId = intent.id;
      amount = intent.amount;
      orderId = intent.metadata?.order_id ?? null;
    } else if (event.type.startsWith("charge") && event.data.object.object === "charge") {
      const charge = event.data.object as Stripe.Charge;
      paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
      providerPaymentId = paymentIntentId ?? charge.id;
      amount = charge.amount_refunded || charge.amount;
      orderId = charge.metadata?.order_id ?? null;
    } else {
      const object = event.data.object as { id?: string };
      providerPaymentId = object.id ?? event.id;
    }
    return {
      providerEventId: event.id,
      type: event.type,
      providerPaymentId,
      paymentIntentId,
      paid,
      failed,
      refunded,
      amount,
      orderId,
      rawHash: payloadHash(rawBody),
    };
  }
}
