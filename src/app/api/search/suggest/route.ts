import { NextResponse } from "next/server";
import { suggestSearch } from "@/services/merchandising";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import type { AppLocale } from "@/lib/i18n";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const locale = (url.searchParams.get("locale") === "en" ? "en" : "ro") as AppLocale;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limited = await rateLimit("search-suggest", ip, RATE_LIMITS.search.limit, RATE_LIMITS.search.windowSec);
  if (!limited.success) {
    return NextResponse.json({ products: [], categories: [], collections: [], articles: [], guides: [], boosts: [] }, { status: 429 });
  }
  const data = await suggestSearch(q, locale);
  return NextResponse.json(data);
}
