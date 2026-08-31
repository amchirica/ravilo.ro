import { Link } from "@/i18n/routing";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveHomepageSections, getActiveCategories, getPublishedArticles, localizeHomepageSection, getActiveBanners } from "@/services/cms";
import { listPublishedCollections } from "@/services/collections";
import { listBestsellers } from "@/services/bestsellers";
import { getStoreSettings } from "@/services/settings";
import { listPublishedBundles, listPublishedProducts, type PublicProduct } from "@/services/catalog";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Button, Container, Section, SectionHeader, TextLink } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { StoreImage } from "@/components/storefront/store-image";
import { listApprovedStoreReviews } from "@/services/reviews";
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
  const [featured, picks, news, popular, collections, banners, articles, guides, bundles, storeReviews] = await Promise.all([
    types.has("FEATURED_PRODUCTS") || fallbackHome ? listPublishedProducts({ featured: true, take: 8, locale }) : emptyProducts,
    types.has("RAVILO_PICKS") ? listPublishedProducts({ raviloPick: true, take: 8, locale }) : emptyProducts,
    types.has("NEW_ARRIVALS") ? listPublishedProducts({ isNew: true, take: 8, locale }) : emptyProducts,
    types.has("BESTSELLERS") ? listBestsellers(locale, 8) : [],
    types.has("COLLECTION") ? listPublishedCollections(locale, true) : [],
    fallbackHome ? [] : getActiveBanners("homepage"),
    types.has("JOURNAL") ? getPublishedArticles(3, locale, "ARTICLE") : [],
    types.has("GUIDES") ? getPublishedArticles(3, locale, "GUIDE") : [],
    types.has("BUNDLE") ? listPublishedBundles(locale) : [],
    types.has("REVIEWS") ? listApprovedStoreReviews(6) : [],
  ]);
  const sections = rawSections.map((section) => localizeHomepageSection(section, locale));

  if (sections.length === 0) {
    return (
      <div>
        <Hero
          eyebrow={settings.storeName}
          headline={t("home.heroHeadline")}
          body={t("home.heroSubtitle")}
          primaryHref="/produse"
          primaryLabel={t("home.ctaPrimary")}
          secondaryHref="/noutati"
          secondaryLabel={t("home.ctaSecondary")}
        />
        {categories.length ? (
          <CategoryStrip title={t("nav.allCategories")} categories={categories} />
        ) : null}
        {featured.items.length ? (
          <Section>
            <Container>
              <SectionHeader title={t("home.picks")} subtitle={t("home.picksSubtitle")} />
              <ProductGrid products={featured.items} />
            </Container>
          </Section>
        ) : null}
        <NewsletterBlock title={t("home.newsletter")} hint={t("home.newsletterHint")} />
      </div>
    );
  }

  return (
    <div>
      {banners.map((banner) => (
        <section key={banner.id} className="border-b border-line">
          <Container className="grid items-end gap-10 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="eyebrow">{settings.storeName}</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.08] tracking-[-0.03em] md:text-5xl">{banner.title}</h2>
              {banner.subtitle ? <p className="mt-4 max-w-md text-mute">{banner.subtitle}</p> : null}
              {banner.ctaUrl ? (
                <Button href={banner.ctaUrl} className="mt-8">
                  {banner.ctaLabel || t("home.seeAll")}
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
      {sections.map((section) => {
        const content = (section.content ?? {}) as Record<string, unknown>;
        if (section.type === "HERO") {
          const image = typeof content.image === "string" ? content.image : "";
          return (
            <Hero
              key={section.id}
              eyebrow={settings.storeName}
              headline={String(content.headline ?? section.title ?? t("home.heroHeadline"))}
              body={String(content.body ?? section.subtitle ?? t("home.heroSubtitle"))}
              primaryHref={ctaHref(content, "cta1", "/produse")}
              primaryLabel={ctaLabel(content, "cta1", t("home.ctaPrimary"))}
              secondaryHref={ctaHref(content, "cta2", "/noutati")}
              secondaryLabel={ctaLabel(content, "cta2", t("home.ctaSecondary"))}
              image={image}
              imageAlt={settings.storeName}
            />
          );
        }
        if (section.type === "CATEGORY_GRID") {
          return <CategoryStrip key={section.id} title={section.title} categories={categories} />;
        }
        if (section.type === "RAVILO_PICKS") {
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader
                  title={section.title || t("home.picks")}
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
                  title={section.title || t("home.popular")}
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
                <SectionHeader title={section.title} />
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
                  <p className="eyebrow">{t("home.featuredBundle")}</p>
                  <h2 className="mt-4 font-display text-4xl tracking-[-0.03em]">{bundle.name}</h2>
                  <p className="mt-4 max-w-md text-mute">{bundle.description}</p>
                  <ul className="mt-6 space-y-1 text-sm text-mute">
                    {bundle.itemNames.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-3xl tracking-[-0.03em]">
                    {formatMoney(bundle.price, locale)}
                    {bundle.compareAtPrice ? (
                      <span className="ml-3 text-lg text-mute line-through">{formatMoney(bundle.compareAtPrice, locale)}</span>
                    ) : null}
                  </p>
                </div>
              </Container>
            </Section>
          );
        }
        if (section.type === "TRUST") {
          const items = (content.items as { title: string; body: string }[] | undefined) ?? [];
          return (
            <section key={section.id} className="border-y border-line">
              <Container className="grid gap-10 py-16 md:grid-cols-4 md:gap-8 md:py-20">
                {items.map((item) => (
                  <div key={item.title}>
                    <h3 className="text-sm tracking-[-0.01em]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mute">{item.body}</p>
                  </div>
                ))}
              </Container>
            </section>
          );
        }
        if (section.type === "EDITORIAL") {
          return (
            <Section key={section.id}>
              <Container className="grid gap-8 md:grid-cols-12">
                <h2 className="font-display text-4xl tracking-[-0.03em] md:col-span-5 md:text-5xl">{section.title}</h2>
                <p className="max-w-xl text-lg leading-relaxed text-mute md:col-span-6 md:col-start-7">{section.subtitle}</p>
              </Container>
            </Section>
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
          const items = (content.items as { title: string; body: string }[] | undefined) ?? [];
          return (
            <Section key={section.id}>
              <Container>
                <SectionHeader title={section.title} subtitle={section.subtitle} />
                <div className="grid gap-10 md:grid-cols-3 md:gap-12">
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
        if (section.type === "NEWSLETTER") {
          return (
            <NewsletterBlock
              key={section.id}
              title={section.title || t("home.newsletter")}
              hint={section.subtitle || t("home.newsletterHint")}
            />
          );
        }
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
            <Button href={secondaryHref} variant="line">
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
  categories,
}: {
  title: string;
  categories: { id: string; slug: string; name: string }[];
}) {
  if (!categories.length) return null;
  return (
    <Section>
      <Container>
        <SectionHeader title={title} />
        <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
          {categories.map((category) => (
            <Link
              prefetch={false}
              key={category.id}
              href={`/categorie/${category.slug}`}
              className="bg-paper px-5 py-12 text-lg tracking-[-0.03em] transition-colors duration-200 hover:bg-surface md:py-16"
            >
              {category.name}
            </Link>
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

function NewsletterBlock({ title, hint }: { title: string; hint: string }) {
  return (
    <section className="bg-surface">
      <Container className="grid items-end gap-8 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h2 className="font-display text-4xl tracking-[-0.03em] md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-md text-mute">{hint}</p>
        </div>
        <NewsletterForm source="homepage" />
      </Container>
    </section>
  );
}
