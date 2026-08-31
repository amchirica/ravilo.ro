import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { listActiveShippingMethods } from "@/services/shipping";

export type LaunchCheck = { ok: boolean; label: string; hint?: string };

export async function getLaunchReadiness(): Promise<{ checks: LaunchCheck[]; liveReady: boolean }> {
  const provider = process.env.PAYMENT_PROVIDER ?? "mock";
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  const stripeMode = stripeKey.startsWith("sk_live_")
    ? "live"
    : stripeKey.startsWith("sk_test_")
      ? "test"
      : stripeKey
        ? "unknown"
        : "missing";
  const webhook = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const appUrl = process.env.APP_URL ?? "";
  const https = appUrl.startsWith("https://");
  const cron = Boolean(process.env.CRON_SECRET);
  const authSecret = process.env.AUTH_SECRET ?? "";
  const authOk = authSecret.length >= 32 && authSecret !== "dev-only-ravilo-auth-secret-change-me-32+";

  let products = 0;
  let shipping = 0;
  let location = false;
  if (isSupabaseConfigured()) {
    const [{ count }, methods, loc] = await Promise.all([
      sb().from("products").select("id", { count: "exact", head: true }).eq("status", "ACTIVE").eq("is_active", true),
      listActiveShippingMethods(),
      sb().from("inventory_locations").select("id").eq("is_default", true).maybeSingle(),
    ]);
    products = count ?? 0;
    shipping = methods.length;
    location = Boolean(loc.data?.id);
  }

  const checks: LaunchCheck[] = [
    {
      ok: provider === "stripe",
      label: `Procesator: ${provider}`,
      hint: provider === "stripe" ? undefined : "Setează PAYMENT_PROVIDER=stripe pe serverul de producție.",
    },
    {
      ok: stripeMode === "live" || stripeMode === "test",
      label:
        stripeMode === "live"
          ? "Cheie Stripe live prezentă"
          : stripeMode === "test"
            ? "Cheie Stripe de test prezentă (localhost)"
            : "Lipsește STRIPE_SECRET_KEY",
      hint:
        stripeMode === "live"
          ? "Pe localhost cheia live este blocată. În production (NODE_ENV=production) este acceptată."
          : stripeMode === "test"
            ? "Pe ravilo.ro pune sk_live_ și NODE_ENV=production."
            : "Adaugă STRIPE_SECRET_KEY în environment.",
    },
    {
      ok: webhook,
      label: webhook ? "Webhook secret configurat" : "Lipsește STRIPE_WEBHOOK_SECRET",
      hint: webhook
        ? "Endpoint producție: https://ravilo.ro/api/webhooks/stripe"
        : "În Stripe Dashboard → Developers → Webhooks creează endpoint-ul live.",
    },
    {
      ok: https || process.env.NODE_ENV !== "production",
      label: https ? `APP_URL HTTPS: ${appUrl}` : `APP_URL: ${appUrl || "lipsă"}`,
      hint: https ? undefined : "În live, APP_URL trebuie să fie https://ravilo.ro",
    },
    {
      ok: cron,
      label: cron ? "CRON_SECRET setat" : "Lipsește CRON_SECRET",
      hint: cron ? undefined : "Obligatoriu în production pentru eliberarea rezervărilor și emailuri.",
    },
    {
      ok: authOk,
      label: authOk ? "AUTH_SECRET setat" : "AUTH_SECRET este default de development",
      hint: authOk ? undefined : "Schimbă AUTH_SECRET înainte de lansare.",
    },
    {
      ok: products > 0,
      label: products > 0 ? `${products} produse active` : "Niciun produs activ",
      hint: products > 0 ? undefined : "Publică cel puțin un produs în Admin → Produse.",
    },
    {
      ok: shipping > 0,
      label: shipping > 0 ? `${shipping} metode de livrare active` : "Nicio metodă de livrare",
      hint: shipping > 0 ? undefined : "Adaugă o metodă în Admin → Livrare.",
    },
    {
      ok: location,
      label: location ? "Depozit implicit existent" : "Lipsește depozitul implicit",
    },
  ];

  const liveReady =
    provider === "stripe" &&
    stripeMode === "live" &&
    webhook &&
    https &&
    cron &&
    authOk &&
    products > 0 &&
    shipping > 0 &&
    location;

  return { checks, liveReady };
}
