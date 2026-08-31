import { sb } from "@/lib/supabase/db";
import { sha256 } from "@/lib/crypto";
import { Container } from "@/components/ui/primitives";
import { ConfirmationPoll } from "@/components/storefront/confirmation-poll";
import { notFound } from "next/navigation";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; session_id?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) notFound();
  const { data: order } = await sb()
    .from("orders")
    .select("public_order_number, payment_status, grand_total, currency")
    .eq("confirmation_token_hash", sha256(token))
    .maybeSingle();
  if (!order) notFound();
  return (
    <section className="bg-surface">
      <Container className="flex min-h-[70vh] max-w-xl items-center py-20">
        <ConfirmationPoll token={token} initialStatus={order.payment_status} orderNumber={order.public_order_number} />
      </Container>
    </section>
  );
}
