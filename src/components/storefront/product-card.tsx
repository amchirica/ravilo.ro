import { Link } from "@/i18n/routing";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/format";
import type { AppLocale } from "@/lib/i18n";
import type { PublicProduct } from "@/services/catalog";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { StoreImage } from "@/components/storefront/store-image";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";

export async function ProductCard({ product }: { product: PublicProduct }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("product");
  const image = product.media.find((item) => item.isPrimary) ?? product.media[0];
  const simple = product.variants.length <= 1;
  const inStock = product.stockStatus !== "OUT" && (product.variants[0]?.inStock ?? false);
  const sale = product.compareAtPrice && product.compareAtPrice > product.salePrice;
  return (
    <article className="group flex flex-col">
      <div className="relative overflow-hidden bg-surface">
        <Link href={`/produs/${product.slug}`} className="block">
          <div className="relative aspect-[4/5]">
            {image ? (
              <StoreImage
                src={image.storagePath}
                alt={image.alt || product.name}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                className="product-photo object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="h-full w-full bg-surface" />
            )}
          </div>
        </Link>
        {sale ? (
          <span className="absolute left-3 top-3 text-[0.625rem] uppercase tracking-[0.16em] text-ink">{t("sale")}</span>
        ) : product.isNew ? (
          <span className="absolute left-3 top-3 text-[0.625rem] uppercase tracking-[0.16em] text-ink">{t("new")}</span>
        ) : null}
        <div className="absolute right-2 top-2">
          <WishlistButton productId={product.id} slug={product.slug} name={product.name} />
        </div>
        {simple && inStock ? (
          <AddToCartForm className="absolute inset-x-3 bottom-3 opacity-100 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
            <input type="hidden" name="variantId" value={product.variants[0]?.id ?? ""} />
            <input type="hidden" name="quantity" value="1" />
            <button
              type="submit"
              className="h-11 w-full bg-ink text-[0.75rem] font-medium tracking-[0.06em] text-paper transition-colors duration-200 hover:bg-olive-dark"
            >
              {t("addToCart")}
            </button>
          </AddToCartForm>
        ) : null}
      </div>
      <div className="mt-4 space-y-1">
        {product.category ? <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-mute">{product.category.name}</p> : null}
        <Link href={`/produs/${product.slug}`} className="block text-[0.9375rem] leading-snug tracking-[-0.02em]">
          {product.name}
        </Link>
        <p className="text-sm text-ink/80">
          {formatMoney(product.salePrice, locale)}
          {sale ? <span className="ml-2 text-mute line-through">{formatMoney(product.compareAtPrice!, locale)}</span> : null}
        </p>
      </div>
    </article>
  );
}
