import "server-only";
import { getEnv } from "@/lib/env";
import { StripeAdapter } from "@/services/payments/stripe";
import { MockAdapter } from "@/services/payments/mock";
import type { PaymentAdapter } from "@/services/payments/types";
import { PaymentError } from "@/services/payments/types";

export function getPaymentAdapter(): PaymentAdapter {
  const provider = getEnv().PAYMENT_PROVIDER;
  if (provider === "mock") return new MockAdapter();
  if (provider === "stripe") return new StripeAdapter();
  throw new PaymentError(`Payment provider ${provider} is not implemented yet`);
}
