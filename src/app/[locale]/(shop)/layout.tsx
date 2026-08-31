import { StoreFooter, StoreHeader } from "@/components/storefront/chrome";
import { StoreBanners } from "@/components/storefront/store-banners";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { StoreToasts } from "@/components/storefront/store-toast";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("nav");
  return (
    <>
      <a
        href="#continut"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
      >
        {t("skipToContent")}
      </a>
      <SiteJsonLd locale={locale} />
      <StoreHeader />
      <StoreBanners placement="global" variant="strip" />
      <main id="continut" className="flex-1">
        {children}
      </main>
      <StoreFooter />
      <StoreToasts />
    </>
  );
}
