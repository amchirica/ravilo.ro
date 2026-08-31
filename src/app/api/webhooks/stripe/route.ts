import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/services/payments/webhook";
import { PaymentError } from "@/services/payments/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  try {
    const result = await handlePaymentWebhook(raw, signature);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PaymentError) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    logger.error("webhook.failed");
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
