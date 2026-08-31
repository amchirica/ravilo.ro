import { getActiveBanners } from "@/services/cms";
import { Button, Container } from "@/components/ui/primitives";
import { StoreImage } from "@/components/storefront/store-image";
import type { BannerPlacement } from "@/lib/banner-placement";
import { getTranslations } from "next-intl/server";

export async function StoreBanners({
  placement,
  variant = "campaign",
}: {
  placement: BannerPlacement;
  variant?: "campaign" | "strip";
}) {
  const banners = await getActiveBanners(placement);
  if (!banners.length) return null;
  const t = await getTranslations("home");
  const cta = (label: string) => label || t("seeAll");
  if (variant === "strip") {
    return (
      <div>
        {banners.map((banner) => (
          <section key={banner.id} className="border-b border-line bg-surface">
            <Container className="flex flex-wrap items-center justify-between gap-4 py-4 md:py-5">
              <div className="min-w-0">
                {banner.title ? <p className="text-base tracking-[-0.02em]">{banner.title}</p> : null}
                {banner.subtitle ? <p className="mt-1 text-sm text-mute">{banner.subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-4">
                {banner.imagePath ? (
                  <div className="relative hidden h-14 w-20 sm:block">
                    <StoreImage src={banner.imagePath} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ) : null}
                {banner.ctaUrl ? (
                  <Button href={banner.ctaUrl} variant="line" className="h-10 px-4">
                    {cta(banner.ctaLabel)}
                  </Button>
                ) : null}
              </div>
            </Container>
          </section>
        ))}
      </div>
    );
  }
  return (
    <div>
      {banners.map((banner) => (
        <section key={banner.id} className="border-b border-line">
          <Container className="grid items-end gap-10 py-12 md:grid-cols-2 md:py-20">
            <div>
              {banner.title ? (
                <h2 className="font-display text-4xl leading-[1.08] tracking-[-0.03em] md:text-5xl">{banner.title}</h2>
              ) : null}
              {banner.subtitle ? <p className="mt-4 max-w-md text-mute">{banner.subtitle}</p> : null}
              {banner.ctaUrl ? (
                <Button href={banner.ctaUrl} className="mt-8">
                  {cta(banner.ctaLabel)}
                </Button>
              ) : null}
            </div>
            {banner.imagePath ? (
              <div className="relative aspect-[4/5] md:aspect-[5/4]">
                <StoreImage src={banner.imagePath} alt="" fill className="object-cover" sizes="50vw" />
              </div>
            ) : null}
          </Container>
        </section>
      ))}
    </div>
  );
}
