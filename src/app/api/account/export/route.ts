import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { collectExportPayload } from "@/services/data-requests";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login?next=/cont/date", request.url));
  }
  const payload = await collectExportPayload(user.id);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ravilo-date-${user.id.slice(0, 8)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
