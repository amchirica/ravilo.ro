import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublishedProductBySlug, listPublishedProducts } from "@/services/catalog";
import { formatMoney } from "@/lib/format";
import { Accordion, Breadcrumb, Button, Container, Field, Input, Select, SectionHeader } from "@/components/ui/primitives";
import { buyNowAction } from "@/server/actions";
import { ProductGrid } from "@/components/storefront/product-grid";
import { getStoreSettings } from "@/services/settings";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { JsonLd } from "@/components/seo/json-ld";
import { ReviewForm } from "@/components/storefront/review-form";
import { RecentlyViewed, RecentlyViewedTracker } from "@/components/storefront/recently-viewed";
import { getEnabledFaqs } from "@/services/cms";
import { getRelatedProducts } from "@/services/merchandising";
import { listApprovedProductReviews, reviewDistribution } from "@/services/reviews";
import { FaqList } from "@/components/storefront/faq-list";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; locale: string }> }): Promise<Metadata> {
  const { slug, locale } = await params;
  setRequestLocale(locale);
  const product = await getPublishedProductBySlug(slug, locale as AppLocale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!product) return { title: "Produs" };
  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription,
    alternates: localeAlternates(`/produs/${product.slug}`, locale as AppLocale, appUrl),
    openGraph: {
      title: product.name,
      description: product.shortDescription,
      locale: locale === "en" ? "en_GB" : "ro_RO",
      images: product.image ? [product.image] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as AppLocale;
  const t = await getTranslations("product");
  const product = await getPublishedProductBySlug(slug, locale);
  if (!product) notFound();
  const related = product.category
    ? await listPublishedProducts({ categorySlug: product.category.slug, take: 4, locale })
    : { items: [] };
  const [reviews, faqs, frequentlyBought, merchRelated, upsells, crossSells, distribution] = await Promise.all([
    listApprovedProductReviews(product.id, 12),
    getEnabledFaqs(locale, { productId: product.id }),
    getRelatedProducts(product.id, "FREQUENTLY_BOUGHT", locale, 4),
    getRelatedProducts(product.id, "RELATED", locale, 4),
    getRelatedProducts(product.id, "UPSELL", locale, 4),
    getRelatedProducts(product.id, "CROSS_SELL", locale, 4),
    reviewDistribution(product.id),
  ]);
  const settings = await getStoreSettings();
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      inLanguage: locale === "en" ? "en" : "ro-RO",
      name: product.name,
      description: product.shortDescription,
      sku: product.sku,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      image: product.image ? [product.image.startsWith("http") ? product.image : `${process.env.APP_URL ?? "http://localhost:3000"}${product.image}`] : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: product.currency || "RON",
        price: (product.salePrice / 100).toFixed(2),
        availability: product.stockStatus === "OUT" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      },
      ...(product.ratingCount > 0
        ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAverage, reviewCount: product.ratingCount } }
        : {}),
      ...(reviews.length
        ? {
            review: reviews.slice(0, 5).map((review) => ({
              "@type": "Review",
              reviewRating: { "@type": "Rating", ratingValue: review.rating },
              name: review.title,
              reviewBody: review.body,
              author: { "@type": "Person", name: review.guestName },
            })),
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "RAVILO", item: process.env.APP_URL ?? "http://localhost:3000" },
        ...(product.category
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: product.category.name,
                item: `${process.env.APP_URL ?? "http://localhost:3000"}/categorie/${product.category.slug}`,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: product.category ? 3 : 2,
          name: product.name,
          item: `${process.env.APP_URL ?? "http://localhost:3000"}/produs/${product.slug}`,
        },
      ],
    },
  ];
  const defaultVariant = product.variants[0];
  const stockLabel =
    product.stockStatus === "OUT" ? t("outOfStock") : product.stockStatus === "LOW" ? t("lowStock") : t("inStock");
  const discount =
    product.compareAtPrice && product.compareAtPrice > product.salePrice
      ? Math.round((1 - product.salePrice / product.compareAtPrice) * 100)
      : 0;
  const relatedItems = (merchRelated.length ? merchRelated : related.items).filter((item) => item.id !== product.id);

  return (
    <Container className="py-8 pb-28 md:py-12 lg:pb-16">
      <JsonLd data={jsonLd} />
      <RecentlyViewedTracker id={product.id} slug={product.slug} name={product.name} />
      <Breadcrumb
        items={[
          { href: "/", label: "RAVILO" },
          ...(product.category ? [{ href: `/categorie/${product.category.slug}`, label: product.category.name }] : []),
          { label: product.name },
        ]}
      />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.9fr)] lg:items-start lg:gap-16 xl:gap-20">
        <ProductGallery media={product.media} productName={product.name} />
        <div className="lg:sticky lg:top-28">
          <p className="eyebrow">
            {product.brand || product.category?.name || (product.isRaviloPick ? t("pick") : null)}
          </p>
          <h1 className="mt-3 font-display text-[2.15rem] leading-[1.08] tracking-[-0.04em] md:text-4xl">{product.name}</h1>
          {product.ratingCount > 0 ? (
            <p className="mt-3 text-sm text-mute">
              {product.ratingAverage?.toFixed(1)} / 5 · {product.ratingCount} {t("reviews").toLowerCase()}
            </p>
          ) : null}
          <p className="mt-5 text-xl tracking-[-0.02em]">
            {formatMoney(product.salePrice, locale)}
            {product.compareAtPrice && product.compareAtPrice > product.salePrice ? (
              <span className="ml-3 text-base text-mute line-through">{formatMoney(product.compareAtPrice, locale)}</span>
            ) : null}
            {discount > 0 ? <span className="ml-3 text-sm text-mute">−{discount}%</span> : null}
          </p>
          <p className="mt-5 max-w-md leading-relaxed text-mute">{product.shortDescription}</p>
          <AddToCartForm className="mt-8 space-y-5">
            {product.variants.length > 1 ? (
              <Field label={t("variant")}>
                <Select name="variantId" defaultValue={defaultVariant?.id}>
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id} disabled={!variant.inStock}>
                      {variant.name} — {formatMoney(variant.price, locale)} {!variant.inStock ? `(${t("outOfStock")})` : ""}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="variantId" value={defaultVariant?.id ?? ""} />
            )}
            <Field label={t("quantity")}>
              <Input type="number" min={1} max={99} name="quantity" defaultValue={1} className="w-24" />
            </Field>
            <p className="text-xs text-mute">{stockLabel}</p>
            <div className="hidden space-y-3 lg:block">
              <Button type="submit" className="w-full" disabled={product.stockStatus === "OUT"}>
                {t("addToCart")}
              </Button>
              <Button type="submit" formAction={buyNowAction} variant="line" className="w-full" disabled={product.stockStatus === "OUT"}>
                {t("buyNow")}
              </Button>
            </div>
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 py-3 lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              <div className="mx-auto flex max-w-[1440px] items-center gap-3">
                <p className="min-w-0 flex-1 text-sm tracking-[-0.01em]">{formatMoney(product.salePrice, locale)}</p>
                <Button type="submit" className="min-w-[9.5rem] flex-1" disabled={product.stockStatus === "OUT"}>
                  {t("addToCart")}
                </Button>
              </div>
            </div>
          </AddToCartForm>
          <p className="mt-6 text-sm text-mute">{t("freeShipping", { amount: formatMoney(settings.freeShippingThreshold, locale) })}</p>
          <div className="mt-5 flex items-center gap-5 text-sm">
            <Link href="/livrare" className="underline-offset-4 hover:underline">
              {t("shipping")}
            </Link>
            <Link href="/retur" className="underline-offset-4 hover:underline">
              {locale === "en" ? "Returns" : "Retur"}
            </Link>
            <WishlistButton productId={product.id} slug={product.slug} name={product.name} />
          </div>
          {product.description ? (
            <div className="prose-ravilo mt-8 whitespace-pre-line text-mute">{product.description}</div>
          ) : null}
          <div className="mt-8">
            {product.whyWeChose ? (
              <Accordion title={t("whyWeChose")}>
                <p className="whitespace-pre-line">{product.whyWeChose}</p>
              </Accordion>
            ) : null}
            {product.howItWorks ? (
              <Accordion title={t("howItWorks")}>
                <p className="whitespace-pre-line">{product.howItWorks}</p>
              </Accordion>
            ) : null}
            {product.specifications || product.attributes.length ? (
              <Accordion title={t("specs")}>
                {product.specifications ? <p className="whitespace-pre-line">{product.specifications}</p> : null}
                {product.attributes.length ? (
                  <table className="mt-2 w-full text-sm">
                    <caption className="sr-only">{t("specs")}</caption>
                    <tbody>
                      {product.attributes.map((attribute) => (
                        <tr key={`${attribute.slug}-${attribute.value}`} className="border-t border-line">
                          <th className="py-2 pr-4 text-left font-medium text-ink">{attribute.name}</th>
                          <td className="py-2">{attribute.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </Accordion>
            ) : null}
            {product.compatibility ? (
              <Accordion title={t("compatibility")}>
                <p className="whitespace-pre-line">{product.compatibility}</p>
              </Accordion>
            ) : null}
            {product.inTheBox ? (
              <Accordion title={t("inTheBox")}>
                <p className="whitespace-pre-line">{product.inTheBox}</p>
              </Accordion>
            ) : null}
          </div>
        </div>
      </div>
      <FaqList items={faqs} title="FAQ" />
      <section className="mt-20 md:mt-28">
        <SectionHeader title={t("reviews")} />
        {distribution.count > 0 ? (
          <p className="mb-8 text-sm text-mute">
            {product.ratingAverage?.toFixed(1)} / 5 · {distribution.count} · 5★ {distribution.buckets[5]} · 4★ {distribution.buckets[4]} · 3★{" "}
            {distribution.buckets[3]} · 2★ {distribution.buckets[2]} · 1★ {distribution.buckets[1]}
          </p>
        ) : (
          <p className="mb-8 text-mute">{t("noReviews")}</p>
        )}
        <ul className="space-y-8">
          {reviews.map((review) => (
            <li key={review.id} className="border-t border-line pt-6">
              <p className="text-sm">
                {review.rating}/5
                {review.verifiedPurchase ? (
                  <span className="ml-2 text-[0.625rem] uppercase tracking-[0.14em] text-mute">{t("verifiedPurchase")}</span>
                ) : null}
              </p>
              <h3 className="mt-2 tracking-[-0.02em]">{review.title}</h3>
              <p className="mt-2 text-mute">{review.body}</p>
              <p className="mt-2 text-xs text-mute">{review.guestName}</p>
            </li>
          ))}
        </ul>
        <ReviewForm productId={product.id} />
      </section>
      {frequentlyBought.length ? (
        <section className="mt-20 md:mt-28">
          <SectionHeader title={t("boughtTogether")} />
          <ProductGrid products={frequentlyBought} />
        </section>
      ) : null}
      {upsells.length ? (
        <section className="mt-20 md:mt-28">
          <SectionHeader title={t("completeWith")} />
          <ProductGrid products={upsells} />
        </section>
      ) : null}
      {crossSells.length ? (
        <section className="mt-20 md:mt-28">
          <SectionHeader title={t("crossSell")} />
          <ProductGrid products={crossSells} />
        </section>
      ) : null}
      {relatedItems.length ? (
        <section className="mt-20 md:mt-28">
          <SectionHeader title={t("related")} />
          <ProductGrid products={relatedItems} />
        </section>
      ) : null}
      <RecentlyViewed currentId={product.id} />
    </Container>
  );
}
