import { listPublishedBundles } from "@/services/catalog";
import { Container, Button } from "@/components/ui/primitives";
import { EmptyState } from "@/components/storefront/empty-state";
import { StoreImage } from "@/components/storefront/store-image";
import { AddBundleForm } from "@/components/storefront/add-bundle-form";
import { formatMoney } from "@/lib/format";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  return {
    title: t("bundlesTitle"),
    description: t("bundlesIntro"),
    alternates: localeAlternates("/pachete", locale as AppLocale, process.env.APP_URL ?? "http://localhost:3000"),
  };
}

export default async function BundlesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("catalog");
  const tHome = await getTranslations("home");
  const bundles = await listPublishedBundles(locale);
  return (
    <Container className="py-16">
      <h1 className="font-display text-5xl">{t("bundlesTitle")}</h1>
      <p className="mt-4 max-w-xl text-mute">{t("bundlesIntro")}</p>
      <div className="mt-10">
        {bundles.length ? (
          <ul className="grid gap-10 md:grid-cols-2">
            {bundles.map((bundle) => (
              <li key={bundle.id} className="border border-line bg-card p-6">
                {bundle.imagePath ? (
                  <div className="relative mb-6 aspect-[5/4]">
                    <StoreImage src={bundle.imagePath} alt="" fill className="object-cover" sizes="50vw" />
                  </div>
                ) : null}
                <h2 className="font-display text-3xl tracking-[-0.03em]">{bundle.name}</h2>
                {bundle.description ? <p className="mt-3 text-sm leading-relaxed text-mute">{bundle.description}</p> : null}
                <ul className="mt-5 space-y-1 text-sm text-mute">
                  {bundle.itemNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
                <p className="mt-6 text-2xl tracking-[-0.03em]">
                  {formatMoney(bundle.price, locale)}
                  {bundle.compareAtPrice ? (
                    <span className="ml-3 text-base text-mute line-through">{formatMoney(bundle.compareAtPrice, locale)}</span>
                  ) : null}
                </p>
                {bundle.items.length >= 2 ? (
                  <AddBundleForm className="mt-6">
                    <input type="hidden" name="bundleId" value={bundle.id} />
                    <Button type="submit">{tHome("addBundle")}</Button>
                  </AddBundleForm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={t("bundlesEmpty")} />
        )}
      </div>
    </Container>
  );
}
