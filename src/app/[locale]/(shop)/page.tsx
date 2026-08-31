import { Link } from "@/i18n/routing";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveHomepageSections, getActiveCategories, getPublishedArticles, localizeHomepageSection } from "@/services/cms";
import { listPublishedCollections } from "@/services/collections";
import { listBestsellers } from "@/services/bestsellers";
import { getStoreSettings } from "@/services/settings";
import { listPublishedBundles, listPublishedProducts, type PublicProduct } from "@/services/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button, Container, Section, SectionHeader, TextLink } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import { StoreImage } from "@/components/storefront/store-image";
import { listApprovedStoreReviews } from "@/services/reviews";
import { CategoryTile } from "@/components/storefront/category-tile";
import { AddBundleForm } from "@/components/storefront/add-bundle-form";
import { StoreBanners } from "@/components/storefront/store-banners";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const t = await getTranslations("home");
  return {
    title: t("heroHeadline"),
    description: t("heroSubtitle"),
    alternates: localeAlternates("/", locale as AppLocale, appUrl),
  };
}

const STALE_HEADLINES = new Set(["Lucruri bune. Alese simplu.", "Good things. Simply chosen."]);
const STALE_SUBTITLES = new Set([
  "Produse utile pentru mașină, casă, tehnologie și călătorii.",
  "Useful products for your car, home, tech and travel.",
]);
const STALE_CATEGORY_TITLES = new Set(["Categorii", "Categories"]);
const STALE_CATEGORY_SUBTITLES = new Set(["Auto, Tech, Home, Travel, EDC."]);
const STALE_PICKS = new Set(["RAVILO Picks", "RAVILO picks"]);
const STALE_POPULAR = new Set(["Popular"]);
const STALE_EDITORIAL = new Set(["Mai puțin zgomot. Mai multă utilitate.", "Less noise. More use."]);
const STALE_EDITORIAL_BODY = new Set([
  "RAVILO alege obiecte care rămân în uz, nu în sertarul de impulse.",
  "RAVILO chooses objects that stay in use, not in the impulse drawer.",
]);
const STALE_CTA = new Set(["Shop now", "Shop products", "Learn more"]);

function freshCopy(stored: string | null | undefined, fallback: string, stale: Set<string>) {
  const value = (stored ?? "").trim();
  if (!value || stale.has(value)) return fallback;
  return value;
}

function ctaHref(content: Record<string, unknown>, key: string, fallback: string) {
  return String((content[key] as { href?: string } | undefined)?.href ?? fallback);
}

function ctaLabel(content: Record<string, unknown>, key: string, fallback: string) {
  return String((content[key] as { label?: string } | undefined)?.label ?? fallback);
}

const emptyProducts = { items: [] as PublicProduct[] };

export default async function HomePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations();
  const [rawSections, settings, categories] = await Promise.all([
    getActiveHomepageSections(),
    getStoreSettings(),
    getActiveCategories(locale),
  ]);
  const types = new Set(rawSections.map((section) => section.type));
  const fallbackHome = rawSections.length === 0;
  const [featured, picks, news, popular, collections, articles, guides, bundles, storeReviews] = await Promise.all([
    types.has("FEATURED_PRODUCTS") || fallbackHome ? listPublishedProducts({ featured: true, take: 8, locale }) : emptyProducts,
    types.has("RAVILO_PICKS") ? listPublishedProducts({ raviloPick: true, take: 8, locale }) : emptyProducts,
    types.has("NEW_ARRIVALS") ? listPublishedProducts({ isNew: true, take: 8, locale }) : emptyProducts,
    types.has("BESTSELLERS") ? listBestsellers(locale, 8) : [],
    types.has("COLLECTION") ? listPublishedCollections(locale, true) : [],
    types.has("JOURNAL") ? getPublishedArticles(3, locale, "ARTICLE") : [],
    types.has("GUIDES") ? getPublishedArticles(3, locale, "GUIDE") : [],
    types.has("BUNDLE") ? listPublishedBundles(locale) : [],
    types.has("REVIEWS") ? listApprovedStoreReviews(6) : [],
  ]);
  const sections = rawSections.map((section) => localizeHomepageSection(section, locale));

  if (sections.length === 0) {
    return (
      <div>
        <StoreBanners placement="homepage" />
        <Hero
          eyebrow={settings.storeName}
          headline={t("home.heroHeadline")}
          body={t("home.heroSubtitle")}
          primaryHref="/produse"
          primaryLabel={t("home.ctaPrimary")}
          secondaryHref="/noutati"
          secondaryLabel={t("home.ctaSecondary")}
        />
        <BrandStatement title={t("home.statementTitle")} body={t("home.statementBody")} />
        {categories.length ? (
          <CategoryStrip
            title={t("home.categoriesTitle")}
            subtitle={t("home.categoriesSubtitle")}
            categories={categories}
          />
        ) : null}
        {featured.items.length ? (
          <Section>
            <Container>
              <SectionHeader title={t("home.picks")} subtitle={t("home.picksSubtitle")} />
              <ProductGrid products={featured.items} />
            </Container>
          </Section>
        ) : null}
        <PlacesBanner title={t("home.placesTitle")} body={t("home.placesBody")} cta={t("home.placesCta")} />
        <WhyRavilo
          title={t("home.why")}
          items={[
            { title: t("home.why1Title"), body: t("home.why1Body") },
            { title: t("home.why2Title"), body: t("home.why2Body") },
            { title: t("home.why3Title"), body: t("home.why3Body") },
            { title: t("home.why4Title"), body: t("home.why4Body") },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <StoreBanners placement="homepage" />
      {sections.map((section) => {
        const content = (section.content ?? {}) as Record<string, unknown>;
        if (section.type === "HERO") {
          const image = typeof content.image === "string" ? content.image : "";
          return (
            <div key={section.id}>
              <Hero
                eyebrow={settings.storeName}
                headline={freshCopy(section.title || String(content.headline ?? ""), t("home.heroHeadline"), STALE_HEADLINES)}
                body={freshCopy(section.subtitle || String(content.body ?? ""), t("home.heroSubtitle"), STALE_SUBTITLES)}
                primaryHref={ctaHref(content, "cta1", "/produse")}
                primaryLabel={freshCopy(ctaLabel(content, "cta1", t("home.ctaPrimary")), t("home.ctaPrimary"), STALE_CTA)}
                secondaryHref={ctaHref(content, "cta2", "/noutati")}
                secondaryLabel={freshCopy(ctaLabel(content, "cta2", t("home.ctaSecondary")), t("home.ctaSecondary"), STALE_CTA)}
                image={image}
                imageAlt={settings.storeName}
              />
              {!types.has("EDITORIAL") ? (
                <BrandStatement title={t("home.statementTitle")} body={t("home.statementBody")} />
              ) : null}
            </div>
          );
        }
        if (section.type === "CATEGORY_GRID") {
          return (
            <CategoryStrip
              key={section.id}
              title={freshCopy(section.title, t("home.categoriesTitle"), STALE_CATEGORY_TITLES)}
              subtitle={freshCopy(section.subtitle, t("home.categoriesSubtitle"), STALE_CATEGORY_SUBTITLES)}
              categories={categories}
            />
          );
        }
        if (section.type === "RAVILO_PICKS") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={freshCopy(section.title, t("home.picks"), STALE_PICKS)}
                  subtitle={section.subtitle || t("home.picksSubtitle")}
                  action={
                    <TextLink href="/colectii/ravilo-picks">{t("home.seeAll")}</TextLink>
                  }
                />
                <ProductGrid products={picks.items} />
              </Container>
            </Section>
          );
        }
        if (section.type === "BESTSELLERS") {
          if (!popular.length) return null;
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={freshCopy(section.title, t("home.popular"), STALE_POPULAR)}
                  subtitle={section.subtitle || t("home.popularSubtitle")}
                  action={<TextLink href="/best-sellers">{t("home.seeAll")}</TextLink>}
                />
                <ProductGrid products={popular} />
              </Container>
            </Section>
          );
        }
        if (section.type === "FEATURED_PRODUCTS") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader title={section.title || t("home.picks")} subtitle={section.subtitle || t("home.picksSubtitle")} />
                <ProductGrid products={featured.items} />
              </Container>
            </Section>
          );
        }
        if (section.type === "NEW_ARRIVALS") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={section.title || t("home.newArrivals")}
                  action={<TextLink href="/noutati">{t("home.seeAll")}</TextLink>}
                />
                <ProductGrid products={news.items} />
              </Container>
            </Section>
          );
        }
        if (section.type === "SHOP_BY_PROBLEM") {
          const items = (content.items as { title: string; href: string }[] | undefined) ?? [];
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader title={section.title} subtitle={section.subtitle} />
                <div className="grid gap-px bg-line md:grid-cols-3">
                  {items.map((item) => (
                    <Link prefetch={false} key={item.href} href={item.href} className="bg-paper px-6 py-12 transition-colors duration-200 hover:bg-surface">
                      <span className="text-xl tracking-[-0.03em] md:text-2xl">{item.title}</span>
                    </Link>
                  ))}
                </div>
              </Container>
            </Section>
          );
        }
        if (section.type === "BUNDLE") {
          const slug = String((content as { slug?: string }).slug ?? bundles[0]?.slug ?? "");
          const bundle = bundles.find((item) => item.slug === slug) ?? bundles[0];
          if (!bundle) return null;
          return (
            <Section key={section.id} className="bg-surface">
              <Container className="grid items-end gap-10 md:grid-cols-2">
                <div>
                  <p className="eyebrow">{section.title || t("home.featuredBundle")}</p>
                  <h2 className="mt-4 font-display text-4xl tracking-[-0.03em]">{bundle.name}</h2>
                  <p className="mt-4 max-w-md text-mute">{bundle.description || section.subtitle}</p>
                  <ul className="mt-6 space-y-1 text-sm text-mute">
                    {bundle.itemNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  {bundle.imagePath ? (
                    <div className="relative mb-6 aspect-[5/4]">
                      <StoreImage src={bundle.imagePath} alt="" fill className="object-cover" sizes="50vw" />
                    </div>
                  ) : null}
                  <p className="text-3xl tracking-[-0.03em]">
                    {formatMoney(bundle.price, locale)}
                    {bundle.compareAtPrice ? (
                      <span className="ml-3 text-lg text-mute line-through">{formatMoney(bundle.compareAtPrice, locale)}</span>
                    ) : null}
                  </p>
                  <div className="mt-8 flex flex-wrap items-center gap-4">
                    {bundle.items.length >= 2 ? (
                      <AddBundleForm>
                        <input type="hidden" name="bundleId" value={bundle.id} />
                        <Button type="submit">{t("home.addBundle")}</Button>
                      </AddBundleForm>
                    ) : null}
                    <TextLink href="/pachete">{t("home.seeAll")}</TextLink>
                  </div>
                </div>
              </Container>
            </Section>
          );
        }
        if (section.type === "TRUST") {
          const items = (content.items as { title: string; body: string }[] | undefined) ?? [];
          return <WhyRavilo key={section.id} title={section.title || t("home.why")} items={items} />;
        }
        if (section.type === "EDITORIAL") {
          return (
            <BrandStatement
              key={section.id}
              title={freshCopy(section.title, t("home.statementTitle"), STALE_EDITORIAL)}
              body={freshCopy(section.subtitle, t("home.statementBody"), STALE_EDITORIAL_BODY)}
            />
          );
        }
        if (section.type === "JOURNAL") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader title={section.title} action={<TextLink href="/blog">{t("home.seeAll")}</TextLink>} />
                <ArticleRow articles={articles} base="/blog" />
              </Container>
            </Section>
          );
        }
        if (section.type === "GUIDES") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={section.title || t("home.buyingGuides")}
                  subtitle={section.subtitle}
                  action={<TextLink href="/ghiduri">{t("home.seeAll")}</TextLink>}
                />
                <ArticleRow articles={guides} base="/ghiduri" />
              </Container>
            </Section>
          );
        }
        if (section.type === "WHY_RAVILO") {
          const stored = (content.items as { title: string; body: string }[] | undefined) ?? [];
          const items = stored.length
            ? stored
            : [
                { title: t("home.why1Title"), body: t("home.why1Body") },
                { title: t("home.why2Title"), body: t("home.why2Body") },
                { title: t("home.why3Title"), body: t("home.why3Body") },
                { title: t("home.why4Title"), body: t("home.why4Body") },
              ];
          return <WhyRavilo key={section.id} title={section.title || t("home.why")} items={items} />;
        }
        if (section.type === "REVIEWS") {
          if (!storeReviews.length) return null;
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader title={section.title || (locale === "en" ? "Reviews" : "Recenzii")} />
                <ul className="grid gap-10 md:grid-cols-3">
                  {storeReviews.map((review) => (
                    <li key={review.id}>
                      <p className="text-xs text-mute">{review.rating}/5</p>
                      <p className="mt-3 text-lg tracking-[-0.02em]">{review.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-mute">{review.body}</p>
                    </li>
                  ))}
                </ul>
              </Container>
            </Section>
          );
        }
        if (section.type === "NEWSLETTER") return null;
        if (section.type === "COLLECTION" || section.type === "CUSTOM_BANNER") {
          if (section.type === "CUSTOM_BANNER") {
            const image = String(content.image ?? "");
            const href = String(content.href ?? content.ctaUrl ?? "");
            return (
              <Section key={section.id}>
                <Container className="grid items-end gap-10 md:grid-cols-2">
                  <div>
                    <h2 className="font-display text-4xl tracking-[-0.03em] md:text-5xl">{section.title}</h2>
                    <p className="mt-4 max-w-md text-mute">{section.subtitle}</p>
                    {href ? (
                      <Button href={href} className="mt-8">
                        {String(content.cta ?? t("home.seeAll"))}
                      </Button>
                    ) : null}
                  </div>
                  {image ? (
                    <div className="relative aspect-[4/5] md:aspect-[5/4]">
                      <StoreImage src={image} alt="" fill className="object-cover" sizes="50vw" />
                    </div>
                  ) : null}
                </Container>
              </Section>
            );
          }
          if (!collections.length) return null;
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={section.title || t("nav.collections")}
                  action={<TextLink href="/colectii">{t("home.seeAll")}</TextLink>}
                />
                <ul className="grid gap-10 md:grid-cols-3">
                  {collections.map((collection) => (
                    <li key={collection.id}>
                      <Link prefetch={false} href={`/colectie/${collection.slug}`} className="group block">
                        <h3 className="text-xl tracking-[-0.03em] transition-colors duration-200 group-hover:text-mute">
                          {collection.name}
                        </h3>
                        {collection.description ? <p className="mt-2 text-sm text-mute">{collection.description}</p> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Container>
            </Section>
          );
        }
        return null;
      })}
      {!types.has("CUSTOM_BANNER") ? (
        <PlacesBanner title={t("home.placesTitle")} body={t("home.placesBody")} cta={t("home.placesCta")} />
      ) : null}
      {!types.has("WHY_RAVILO") && !types.has("TRUST") ? (
        <WhyRavilo
          title={t("home.why")}
          items={[
            { title: t("home.why1Title"), body: t("home.why1Body") },
            { title: t("home.why2Title"), body: t("home.why2Body") },
            { title: t("home.why3Title"), body: t("home.why3Body") },
            { title: t("home.why4Title"), body: t("home.why4Body") },
          ]}
        />
      ) : null}
    </div>
  );
}

function Hero({
  eyebrow,
  headline,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  image,
  imageAlt,
}: {
  eyebrow: string;
  headline: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  image?: string;
  imageAlt?: string;
}) {
  return (
    <section>
      <Container className="grid items-end gap-10 py-16 md:grid-cols-12 md:gap-12 md:py-24 lg:py-28">
        <div className="md:col-span-5">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 font-display text-[clamp(2.8rem,6vw,5.75rem)] leading-[0.95] tracking-[-0.04em]">
            {headline}
          </h1>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-mute">{body}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href={primaryHref}>{primaryLabel}</Button>
            <Button href={secondaryHref} variant="secondary">
              {secondaryLabel}
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/5] bg-surface md:col-span-7 md:aspect-[5/4]">
          {image ? (
            <StoreImage src={image} alt={imageAlt || ""} fill sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" priority />
          ) : null}
        </div>
      </Container>
    </section>
  );
}

function CategoryStrip({
  title,
  subtitle,
  categories,
}: {
  title: string;
  subtitle?: string;
  categories: { id: string; slug: string; name: string; heroImage?: string | null }[];
}) {
  if (!categories.length) return null;
  return (
    <Section>
      <Container>
        <SectionHeader title={title} subtitle={subtitle} />
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-8 md:gap-y-14">
          {categories.map((category) => (
            <CategoryTile
              key={category.id}
              href={`/categorie/${category.slug}`}
              name={category.name}
              image={category.heroImage}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}

function ArticleRow({
  articles,
  base,
}: {
  articles: { id: string; slug: string; title: string; excerpt: string }[];
  base: string;
}) {
  if (!articles.length) return null;
  return (
    <div className="grid gap-10 md:grid-cols-3">
      {articles.map((article) => (
        <Link prefetch={false} key={article.id} href={`${base}/${article.slug}`} className="group block">
          <h3 className="text-xl tracking-[-0.03em] transition-colors duration-200 group-hover:text-mute">{article.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-mute">{article.excerpt}</p>
        </Link>
      ))}
    </div>
  );
}

function BrandStatement({ title, body }: { title: string; body: string }) {
  return (
    <Section className="bg-surface">
      <Container className="grid gap-8 md:grid-cols-12">
        <h2 className="font-display text-4xl tracking-[-0.03em] md:col-span-5 md:text-5xl">{title}</h2>
        <p className="max-w-xl text-lg leading-relaxed text-mute md:col-span-6 md:col-start-7">{body}</p>
      </Container>
    </Section>
  );
}

function PlacesBanner({ title, body, cta }: { title: string; body: string; cta: string }) {
  return (
    <Section className="bg-surface">
      <Container className="max-w-3xl">
        <h2 className="font-display text-4xl tracking-[-0.03em] md:text-5xl">{title}</h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">{body}</p>
        <Button href="/produse" variant="secondary" className="mt-10">
          {cta}
        </Button>
      </Container>
    </Section>
  );
}

function WhyRavilo({ title, items }: { title: string; items: { title: string; body: string }[] }) {
  if (!items.length) return null;
  return (
    <Section>
      <Container>
        <SectionHeader title={title} />
        <div className="grid gap-10 md:grid-cols-2 md:gap-12 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title}>
              <h3 className="text-base tracking-[-0.02em]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-mute">{item.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}

