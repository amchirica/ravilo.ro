import { Container, Field, Input, Button } from "@/components/ui/primitives";
import { lookupOrderByNumberAndEmail, mapOrderStatus, trackingSteps } from "@/services/orders-lookup";
import { getTranslations } from "next-intl/server";

export default async function TrackOrderPage({ searchParams }: { searchParams: Promise<{ n?: string; e?: string }> }) {
  const t = await getTranslations("tracking");
  const { n, e } = await searchParams;
  const order = n && e ? await lookupOrderByNumberAndEmail(n, e) : null;
  const looked = Boolean(n && e);
  const current = order ? mapOrderStatus(order) : null;
  const steps = current && current !== "CANCELLED" ? trackingSteps(current) : [];
  const labels: Record<string, string> = {
    RECEIVED: t("received"),
    CONFIRMED: t("confirmed"),
    PROCESSING: t("processing"),
    SHIPPED: t("shipped"),
    DELIVERED: t("delivered"),
  };
  return (
    <Container className="max-w-xl py-16">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-4 text-mute">{t("intro")}</p>
      <form className="mt-8 grid gap-4">
        <Field label={t("orderNumber")}>
          <Input name="n" required defaultValue={n} autoComplete="off" />
        </Field>
        <Field label={t("email")}>
          <Input name="e" type="email" required defaultValue={e} autoComplete="email" />
        </Field>
        <Button type="submit">{t("submit")}</Button>
      </form>
      {looked && !order ? <p className="mt-8 text-sm text-warning">{t("missing")}</p> : null}
      {order ? (
        <div className="mt-10 border-t border-line pt-8">
          <p className="text-xs uppercase tracking-[0.16em] text-mute">{order.publicOrderNumber}</p>
          {current === "CANCELLED" ? (
            <p className="mt-4 font-display text-2xl">{t("cancelled")}</p>
          ) : (
            <ol className="mt-6 grid gap-3">
              {steps.map((step) => (
                <li key={step.status} className={step.done ? "text-ink" : "text-mute"}>
                  <span className="mr-2">{step.done ? "●" : "○"}</span>
                  {labels[step.status]}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </Container>
  );
}
