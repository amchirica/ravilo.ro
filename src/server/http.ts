import "server-only";
import { cookies, headers } from "next/headers";
import { hashIp } from "@/lib/crypto";

export const COOKIES = {
  session: "ravilo_session",
  cart: "ravilo_cart",
  consent: "ravilo_consent",
} as const;

export async function sessionCookieOptions(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

export async function getCookie(name: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(name)?.value;
}

export async function setCookie(name: string, value: string, maxAgeSec: number) {
  const store = await cookies();
  store.set(name, value, await sessionCookieOptions(maxAgeSec));
}

export async function clearCookie(name: string) {
  const store = await cookies();
  store.set(name, "", { ...await sessionCookieOptions(0), maxAge: 0 });
}

export async function clientContext() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headerList.get("x-real-ip");
  const userAgent = headerList.get("user-agent") ?? undefined;
  return { ip, ipHash: hashIp(ip), userAgent };
}

export function requestOriginAllowed(request: Request, appUrl: string): boolean {
  const allowed = new URL(appUrl).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (origin) return origin === allowed;
  if (referer) {
    try {
      return new URL(referer).origin === allowed;
    } catch {
      return false;
    }
  }
  return request.method === "GET" || request.method === "HEAD";
}
