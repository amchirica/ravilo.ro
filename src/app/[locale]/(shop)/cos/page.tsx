import { getLocale, getTranslations } from "next-intl/server";
import { getCartView } from "@/services/cart";
import { getStoreSettings } from "@/services/settings";
import { formatMoney } from "@/lib/format";
import { Button, Container, Input, PageTitle } from "@/components/ui/primitives";
import { updateCartAction } from "@/server/actions";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { pickLocalized, type AppLocale } from "@/lib/i18n";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/storefront/empty-state";
import { StoreImage } from "@/components/storefront/store-image";
import { StoreBanners } from "@/components/storefront/store-banners";

export default async function CartPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("cart");
  const tSearch = await getTranslations("search");
  const [cart, settings] = await Promise.all([getCartView(), getStoreSettings()]);
  const ids = cart.items.map((item) => item.variantId);
  const variants =
    ids.length === 0 || !isSupabaseConfigured()
      ? []
      : camelList<{
          id: string;
          name: string;
          product: {
            slug: string;
            name: string;
            nameEn: string | null;
            media: { storagePath: string; isPrimary: boolean }[];
          };
        }>(
          (
            await sb()
              .from("product_variants")
              .select("id, name, product:products(slug, name, name_en, media:product_media(storage_path, is_primary))")
              .in("id", ids)
          ).data,
        );
  const byId = new Map(variants.map((row) => [row.id, row]));
  const quote = cart.quote;
  const merchandise = quote ? quote.subtotal - quote.discountTotal : 0;
  const remaining = quote ? Math.max(0, settings.freeShippingThreshold - merchandise) : settings.freeShippingThreshold;
  const progress =
    settings.freeShippingThreshold > 0 ? Math.min(100, Math.round((merchandise / settings.freeShippingThreshold) * 100)) : 0;
  return (
    <>
      <StoreBanners placement="cart" variant="strip" />
      <Container className="py-12 md:py-16">
      <PageTitle title={t("title")} />
      {cart.items.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} actionHref="/produse" actionLabel={tSearch("discover")} />
      ) : (
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <ul>
            {cart.items.map((item) => {
              const variant = byId.get(item.variantId);
              const name = pickLocalized(variant?.product.name, variant?.product.nameEn, locale);
              const image = variant?.product.media?.find((row) => row.isPrimary)?.storagePath ?? variant?.product.media?.[0]?.storagePath;
              const line = quote?.lines.find((entry) => entry.variantId === item.variantId);
              return (
                <li key={item.id} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border-b border-line py-6 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-start">
                  {image ? (
                    <Link href={`/produs/${variant?.product.slug}`} className="relative aspect-[4/5] overflow-hidden bg-surface">
                      <StoreImage src={image} alt="" fill className="object-cover" sizes="104px" />
                    </Link>
                  ) : (
                    <div className="aspect-[4/5] bg-surface" />
                  )}
                  <div className="min-w-0">
                    <Link href={`/produs/${variant?.product.slug}`} className="tracking-[-0.02em]">
                      {name}
                    </Link>
                    <p className="mt-1 text-sm text-mute">{variant?.name}</p>
                    {line ? <p className="mt-2 text-sm">{formatMoney(line.unitPrice, locale)}</p> : null}
                    <form action={updateCartAction} className="mt-4 flex flex-wrap items-center gap-3">
                      <input type="hidden" name="variantId" value={item.variantId} />
                      <Input type="number" name="quantity" defaultValue={item.quantity} min={0} max={99} className="w-20" aria-label={t("update")} />
                      <button type="submit" className="text-xs uppercase tracking-[0.14em] text-mute hover:text-ink">
                        {t("update")}
                      </button>
                      <button name="quantity" value="0" className="text-xs uppercase tracking-[0.14em] text-mute hover:text-ink">
                        {t("remove")}
                      </button>
                    </form>
                  </div>
                  {line ? <p className="hidden text-sm sm:block">{formatMoney(line.lineTotal, locale)}</p> : null}
                </li>
              );
            })}
          </ul>
          <aside className="h-fit lg:sticky lg:top-28">
            <p className="text-sm text-mute">{t("hint")}</p>
            {settings.freeShippingThreshold > 0 ? (
              <div className="mt-6">
                <p className="text-xs text-mute">
                  {remaining <= 0 ? t("freeShippingDone") : t("freeShippingLeft", { amount: formatMoney(remaining, locale) })}
                </p>
                <div className="mt-3 h-px bg-line">
                  <div className="h-px bg-ink transition-[width] duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}
            {quote ? (
              <dl className="mt-8 space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">{t("subtotal")}</dt>
                  <dd>{formatMoney(quote.subtotal, locale)}</dd>
                </div>
                {quote.discountTotal ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-mute">{t("discount")}</dt>
                    <dd>−{formatMoney(quote.discountTotal, locale)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-mute">{t("shipping")}</dt>
                  <dd>{formatMoney(quote.shippingTotal, locale)}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-line pt-3 text-base tracking-[-0.02em]">
                  <dt>{t("total")}</dt>
                  <dd>{formatMoney(quote.grandTotal, locale)}</dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-sm">{t("update")}</p>
            )}
            <Button href="/checkout" className="mt-8 w-full">
              {t("checkout")}
            </Button>
            <Button href="/produse" variant="line" className="mt-3 w-full">
              {t("continue")}
            </Button>
          </aside>
        </div>
      )}
    </Container>
    </>
  );
}
