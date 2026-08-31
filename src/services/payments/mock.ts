import "server-only";
import { getEnv } from "@/lib/env";
import { payloadHash, randomToken } from "@/lib/crypto";
import { safeInternalPath } from "@/lib/redirect";
import {
  PaymentError,
  type CreateCheckoutInput,
  type CreateCheckoutResult,
  type NormalizedWebhookEvent,
  type PaymentAdapter,
  type RefundInput,
} from "@/services/payments/types";

/** Development-only adapter. Disabled in production. */
export class MockAdapter implements PaymentAdapter {
  readonly key = "MOCK" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (getEnv().NODE_ENV === "production") {
      throw new PaymentError("Mock payments are not allowed in production");
    }
    const providerPaymentId = `mock_${randomToken(12)}`;
    const next = encodeURIComponent(input.successUrl);
    const redirectUrl = `${getEnv().APP_URL}/api/payments/mock/complete?orderId=${encodeURIComponent(input.orderId)}&paymentId=${encodeURIComponent(providerPaymentId)}&next=${next}`;
    return { provider: "MOCK", providerPaymentId, redirectUrl };
  }

  async refund(input: RefundInput) {
    void input;
    if (getEnv().NODE_ENV === "production") {
      throw new PaymentError("Mock payments are not allowed in production");
    }
    return { refundId: `mock_re_${randomToken(8)}` };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<NormalizedWebhookEvent> {
    if (getEnv().NODE_ENV === "production") {
      throw new PaymentError("Mock payments are not allowed in production");
    }
    if (signature !== "mock") throw new PaymentError("Invalid webhook signature");
    const payload = JSON.parse(rawBody) as {
      id: string;
      type: string;
      providerPaymentId: string;
      paid: boolean;
      failed?: boolean;
      refunded?: boolean;
      amount: number;
    };
    return {
      providerEventId: payload.id,
      type: payload.type,
      providerPaymentId: payload.providerPaymentId,
      paid: payload.paid,
      failed: Boolean(payload.failed),
      refunded: Boolean(payload.refunded),
      amount: payload.amount,
      rawHash: payloadHash(rawBody),
    };
  }
}

export function mockSuccessPath(next: string | null): string {
  if (!next) return "/";
  try {
    const url = new URL(next);
    return safeInternalPath(`${url.pathname}${url.search}`);
  } catch {
    return safeInternalPath(next);
  }
}
