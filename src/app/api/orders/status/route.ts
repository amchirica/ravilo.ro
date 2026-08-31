import { NextResponse } from "next/server";
import { sb } from "@/lib/supabase/db";
import { sha256 } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing" }, { status: 400 });
  const { data: order } = await sb()
    .from("orders")
    .select("payment_status, status, public_order_number")
    .eq("confirmation_token_hash", sha256(token))
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { paymentStatus: order.payment_status, status: order.status, orderNumber: order.public_order_number },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
