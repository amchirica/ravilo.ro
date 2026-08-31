import { getCartView } from "@/services/cart";
import { getCurrentUser } from "@/server/auth/session";
import { checkoutAction } from "@/server/actions";
import { CheckoutSubmit } from "@/components/storefront/checkout-submit";
import { Container, Field, Input, PageTitle, Select, Textarea } from "@/components/ui/primitives";
import { getStoreSettings } from "@/services/settings";
import { listActiveShippingMethods } from "@/services/shipping";
import { formatMoney } from "@/lib/format";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("checkout");
  const { err } = await searchParams;
  const methods = await listActiveShippingMethods();
  const cart = await getCartView(methods[0]?.id);
  const settings = await getStoreSettings();
  if (cart.items.length === 0) redirect("/cos");
  const user = await getCurrentUser();
  const remaining = cart.quote
    ? Math.max(0, settings.freeShippingThreshold - (cart.quote.subtotal - cart.quote.discountTotal))
    : settings.freeShippingThreshold;
  return (
    <Container className="py-12 md:py-16">
      <PageTitle title={t("title")} description={t("hint")} />
      {err ? <p className="-mt-6 mb-8 text-sm text-warning">{err}</p> : null}
      <form action={checkoutAction} className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-16">
        <div className="grid gap-8">
          <section className="grid gap-4">
            <h2 className="text-lg tracking-[-0.02em]">{t("contact")}</h2>
            <Field label={t("email")}>
              <Input name="email" type="email" required defaultValue={user?.email} autoComplete="email" />
            </Field>
            <Field label={t("phone")}>
              <Input name="phone" required autoComplete="tel" />
            </Field>
          </section>
          <section className="grid gap-4">
            <h2 className="text-lg tracking-[-0.02em]">{t("shipping")}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("firstName")}>
                <Input name="firstName" required defaultValue={user?.firstName} />
              </Field>
              <Field label={t("lastName")}>
                <Input name="lastName" required defaultValue={user?.lastName} />
              </Field>
            </div>
            <Field label={t("county")}>
              <Input name="county" required />
            </Field>
            <Field label={t("city")}>
              <Input name="city" required />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label={t("street")}>
                <Input name="street" required />
              </Field>
              <Field label={t("number")}>
                <Input name="number" required />
              </Field>
              <Field label={t("postalCode")}>
                <Input name="postalCode" required />
              </Field>
            </div>
            <Field label={t("country")}>
              <Input name="country" defaultValue="RO" required />
            </Field>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label={t("building")}>
                <Input name="building" />
              </Field>
              <Field label={t("entrance")}>
                <Input name="entrance" />
              </Field>
              <Field label={t("floor")}>
                <Input name="floor" />
              </Field>
              <Field label={t("apartment")}>
                <Input name="apartment" />
              </Field>
            </div>
          </section>
          <section className="grid gap-4">
            <h2 className="text-lg tracking-[-0.02em]">{t("billing")}</h2>
            <Field label={t("company")}>
              <Input name="company" />
            </Field>
            <Field label={t("cui")}>
              <Input name="cui" />
            </Field>
            <Field label={t("reg")}>
              <Input name="registrationNumber" />
            </Field>
          </section>
          <section className="grid gap-4">
            <h2 className="text-lg tracking-[-0.02em]">{t("payment")}</h2>
            <Field label={t("method")}>
              {methods.length === 0 ? (
                <p className="text-sm text-warning">{t("noShipping")}</p>
              ) : (
                <Select name="shippingMethodId" required>
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} — {formatMoney(method.price, locale)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("discountCode")}>
              <Input name="discountCode" />
            </Field>
            <Field label={t("notes")}>
              <Textarea name="customerNotes" rows={3} />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="marketingConsent" className="mt-1 size-4 accent-ink" />
              {t("marketing")}
            </label>
          </section>
        </div>
        <aside className="h-fit border-t border-line pt-8 lg:sticky lg:top-28 lg:border-t-0 lg:pt-0">
          {cart.quote ? (
            <div className="text-sm">
              {cart.quote.lines.map((line) => (
                <input key={line.variantId} type="hidden" name={`snapshotPrice_${line.variantId}`} value={line.unitPrice} />
              ))}
              <div className="flex justify-between gap-4">
                <span className="text-mute">{t("shipping")}</span>
                <span>{formatMoney(cart.quote.shippingTotal, locale)}</span>
              </div>
              <div className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-base tracking-[-0.02em]">
                <span>{t("total")}</span>
                <span>{formatMoney(cart.quote.grandTotal, locale)}</span>
              </div>
              <p className="mt-4 text-xs text-mute">
                {remaining <= 0 ? t("freeShippingDone") : t("freeShippingLeft", { amount: formatMoney(remaining, locale) })}
              </p>
            </div>
          ) : null}
          {methods.length > 0 ? <CheckoutSubmit label={t("pay")} pendingLabel={t("paying")} /> : null}
          <ul className="mt-6 grid gap-2 text-xs leading-relaxed text-mute">
            <li>{t("trustSecure")}</li>
            <li>{t("trustReturns")}</li>
            <li>{t("trustVat")}</li>
          </ul>
        </aside>
      </form>
    </Container>
  );
}
