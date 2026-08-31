import "server-only";
import type { PaymentProviderKey } from "@/types/domain";

export type { PaymentProviderKey };

export type CreateCheckoutInput = {
  orderId: string;
  publicOrderNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  locale?: string;
  expiresAt?: Date;
  lineItems?: {
    quantity: number;
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description?: string };
    };
  }[];
};

export type CreateCheckoutResult = {
  provider: PaymentProviderKey;
  providerPaymentId: string;
  redirectUrl: string;
};

export type RefundInput = {
  providerPaymentId: string;
  amount: number;
  reason?: string;
};

export type NormalizedWebhookEvent = {
  providerEventId: string;
  type: string;
  providerPaymentId: string;
  paymentIntentId?: string | null;
  paid: boolean;
  failed: boolean;
  refunded: boolean;
  amount: number | null;
  orderId?: string | null;
  rawHash: string;
};

export interface PaymentAdapter {
  readonly key: PaymentProviderKey;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  parseWebhook(rawBody: string, signature: string | null): Promise<NormalizedWebhookEvent>;
}

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}
