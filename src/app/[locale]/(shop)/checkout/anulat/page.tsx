import { Container, Button } from "@/components/ui/primitives";
import { getTranslations } from "next-intl/server";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";

export default async function CheckoutCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const t = await getTranslations("checkout");
  const { session_id: sessionId } = await searchParams;
  if (sessionId && isSupabaseConfigured()) {
    const { data: payment } = await sb()
      .from("payments")
      .select("id, status, order_id")
      .eq("provider_payment_id", sessionId)
      .maybeSingle();
    if (payment && payment.status === "PENDING") {
      await sb().from("payments").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("id", payment.id);
      await sb()
        .from("orders")
        .update({ payment_status: "FAILED", updated_at: new Date().toISOString() })
        .eq("id", payment.order_id);
    }
  }
  return (
    <section className="bg-surface">
      <Container className="max-w-xl py-20 text-center">
      <h1 className="font-display text-4xl">{t("cancelledTitle")}</h1>
      <p className="mt-4 text-mute">{t("cancelledHint")}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/checkout">{t("retry")}</Button>
        <Button href="/cos" variant="secondary">
          {t("backToCart")}
        </Button>
      </div>
    </Container>
    </section>
  );
}
