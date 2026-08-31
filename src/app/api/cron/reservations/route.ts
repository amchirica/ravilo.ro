import { NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/services/inventory";
import { processEmailOutbox } from "@/services/email";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const released = await releaseExpiredReservations();
  await processEmailOutbox();
  return NextResponse.json({ ok: true, released });
}
