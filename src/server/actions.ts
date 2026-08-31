"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { redirect as shopRedirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { addToCart, updateCartItem } from "@/services/cart";
import { createCheckout } from "@/services/checkout";
import { login, logout, register, requestPasswordReset, resetPassword, verifyEmail } from "@/services/auth";
import { headers } from "next/headers";
import { postAuthPath } from "@/lib/redirect";
import { authScopeFromRequest, type AuthScope } from "@/lib/supabase/auth-scope";
import { isRedirectError } from "next/dist/client/components/redirect-error";

async function clientIp() {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function addToCartAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  await addToCart(variantId, quantity);
  revalidatePath("/cos");
}

export async function buyNowAction(formData: FormData) {
  await addToCartAction(formData);
  shopRedirect({ href: "/checkout", locale: await getLocale() });
}

export async function updateCartAction(formData: FormData) {
  const variantId = String(formData.get("variantId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  await updateCartItem(variantId, quantity);
  revalidatePath("/cos");
}

export async function checkoutAction(formData: FormData) {
  const displayedUnitPrices: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("snapshotPrice_") && typeof value === "string") {
      const variantId = key.slice("snapshotPrice_".length);
      const amount = Number(value);
      if (variantId && Number.isInteger(amount)) displayedUnitPrices[variantId] = amount;
    }
  }
  const payload = {
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    customerNotes: String(formData.get("customerNotes") ?? ""),
    shippingMethodId: String(formData.get("shippingMethodId") ?? ""),
    discountCode: String(formData.get("discountCode") ?? "") || undefined,
    marketingConsent: formData.get("marketingConsent") === "on",
    sameAsShipping: formData.get("sameAsShipping") !== "off",
    displayedUnitPrices,
    shipping: {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      company: String(formData.get("company") ?? "") || undefined,
      cui: String(formData.get("cui") ?? "") || undefined,
      registrationNumber: String(formData.get("registrationNumber") ?? "") || undefined,
      county: String(formData.get("county") ?? ""),
      city: String(formData.get("city") ?? ""),
      street: String(formData.get("street") ?? ""),
      number: String(formData.get("number") ?? ""),
      building: String(formData.get("building") ?? "") || undefined,
      entrance: String(formData.get("entrance") ?? "") || undefined,
      floor: String(formData.get("floor") ?? "") || undefined,
      apartment: String(formData.get("apartment") ?? "") || undefined,
      postalCode: String(formData.get("postalCode") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      country: String(formData.get("country") ?? "RO") || "RO",
    },
  };
  try {
    const result = await createCheckout(payload);
    redirect(result.redirectUrl);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const { CheckoutError } = await import("@/services/checkout");
    const { InventoryError } = await import("@/services/inventory");
    const { PaymentError } = await import("@/services/payments/types");
    if (process.env.NODE_ENV !== "production") {
      console.error("[checkoutAction]", error instanceof Error ? `${error.name}: ${error.message}` : error);
    }
    const message =
      error instanceof CheckoutError || error instanceof InventoryError || error instanceof PaymentError
        ? error.message
        : error instanceof Error && error.message.includes("Live Stripe key")
          ? "Cheia Stripe live nu poate fi folosită pe localhost. Folosește o cheie sk_test_ în .env.local."
          : "Nu am putut porni plata. Verifică coșul și încearcă din nou.";
    shopRedirect({ href: `/checkout?err=${encodeURIComponent(message.slice(0, 220))}`, locale: await getLocale() });
  }
}

async function requestAuthScope() {
  const list = await headers();
  return authScopeFromRequest(list.get("x-ravilo-pathname") ?? "", list.get("referer"));
}

async function completeLogin(formData: FormData, scope: AuthScope): Promise<void> {
  const rawNext = String(formData.get("next") ?? "/");
  const isAdmin = scope === "admin";
  const loginPath = isAdmin ? "/admin/login" : "/auth/login";
  const next = postAuthPath(rawNext, isAdmin ? "/admin" : "/cont");
  try {
    await login(
      {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      },
      await clientIp(),
      scope,
    );
  } catch (error) {
    if (isRedirectError(error)) throw error;
    const { AuthError } = await import("@/server/auth/session");
    const code = error instanceof AuthError ? error.code : "invalid";
    const flag =
      code === "confirm" ? "confirm" : code === "rate" ? "rate" : code === "role" ? "role" : code === "session" ? "session" : "1";
    if (process.env.NODE_ENV !== "production") {
      console.error("[loginAction]", scope, error instanceof Error ? `${error.name}: ${error.message}` : error);
    }
    const href = `${loginPath}?e=${flag}&next=${encodeURIComponent(next)}`;
    if (isAdmin) redirect(href);
    shopRedirect({ href, locale: await getLocale() });
  }
  if (isAdmin) redirect(next);
  shopRedirect({ href: next, locale: await getLocale() });
}

export async function loginAction(formData: FormData): Promise<void> {
  await completeLogin(formData, "shop");
}

export async function adminLoginAction(formData: FormData): Promise<void> {
  await completeLogin(formData, "admin");
}

export async function registerAction(formData: FormData): Promise<void> {
  let hasSession = false;
  try {
    const result = await register(
      {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
        phone: String(formData.get("phone") ?? "") || undefined,
        marketingConsent: formData.get("marketingConsent") === "on",
      },
      await clientIp(),
    );
    hasSession = result.hasSession;
  } catch (error) {
    const { AuthError } = await import("@/server/auth/session");
    const code = error instanceof AuthError ? error.code : "generic";
    const flag = code === "exists" ? "exists" : code === "policy" ? "parola" : "1";
    shopRedirect({ href: `/auth/inregistrare?e=${flag}`, locale: await getLocale() });
  }
  if (hasSession) shopRedirect({ href: "/cont", locale: await getLocale() });
  shopRedirect({ href: "/auth/verificare?nou=1", locale: await getLocale() });
}

export async function logoutAction() {
  const scope = await requestAuthScope();
  await logout(scope);
  if (scope === "admin") redirect("/admin/login");
  shopRedirect({ href: "/", locale: await getLocale() });
}

export async function forgotAction(formData: FormData): Promise<void> {
  await requestPasswordReset({ email: String(formData.get("email") ?? "") }, await clientIp());
  shopRedirect({ href: "/auth/recuperare?sent=1", locale: await getLocale() });
}

export async function resetAction(formData: FormData): Promise<void> {
  try {
    await resetPassword({
      token: String(formData.get("token") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
  } catch {
    shopRedirect({ href: "/auth/reset?e=1", locale: await getLocale() });
  }
  shopRedirect({ href: "/auth/login", locale: await getLocale() });
}

export async function verifyAction() {
  await verifyEmail();
}

export async function submitReviewAction(formData: FormData) {
  const { submitReview } = await import("@/services/reviews");
  await submitReview({
    productId: String(formData.get("productId") ?? "") || undefined,
    kind: formData.get("kind") === "STORE" ? "STORE" : "PRODUCT",
    rating: Number(formData.get("rating") ?? 5),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  revalidatePath("/produs");
}

export async function subscribeNewsletterAction(formData: FormData) {
  const { subscribeNewsletter } = await import("@/services/newsletter");
  await subscribeNewsletter(String(formData.get("email") ?? ""), String(formData.get("source") ?? "footer"));
}
