import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { handlePaymentWebhook } from "@/services/payments/webhook";
import { sb } from "@/lib/supabase/db";
import { randomToken } from "@/lib/crypto";
import { mockSuccessPath } from "@/services/payments/mock";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = getEnv();
  if (env.NODE_ENV === "production" || env.PAYMENT_PROVIDER !== "mock") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const paymentId = url.searchParams.get("paymentId");
  const next = mockSuccessPath(url.searchParams.get("next"));
  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { data: order } = await sb().from("orders").select("id, grand_total").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const payload = JSON.stringify({
    id: `evt_${randomToken(8)}`,
    type: "mock.payment_succeeded",
    providerPaymentId: paymentId,
    paid: true,
    amount: order.grand_total,
  });
  await handlePaymentWebhook(payload, "mock");
  return NextResponse.redirect(new URL(next, env.APP_URL));
}
