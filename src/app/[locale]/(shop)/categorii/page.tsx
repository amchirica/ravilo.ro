import { Link } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getActiveCategories, getChildCategories } from "@/services/cms";
import { Container, PageTitle } from "@/components/ui/primitives";
import { CategoryTile } from "@/components/storefront/category-tile";
import { StoreBanners } from "@/components/storefront/store-banners";
import { localeAlternates, type AppLocale } from "@/lib/i18n";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return {
    title: t("categories"),
    alternates: localeAlternates("/categorii", locale as AppLocale, appUrl),
  };
}

export default async function CategoriesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const locale = localeParam as AppLocale;
  const t = await getTranslations("catalog");
  const categories = await getActiveCategories(locale);
  const withChildren = await Promise.all(
    categories.map(async (category) => ({
      ...category,
      children: await getChildCategories(category.id, locale),
    })),
  );
  return (
    <>
      <StoreBanners placement="category" />
      <Container className="py-12 md:py-16">
      <PageTitle title={t("categories")} />
      <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-8 md:gap-y-16">
        {withChildren.map((category) => (
          <article key={category.id}>
            <CategoryTile href={`/categorie/${category.slug}`} name={category.name} image={category.heroImage} />
            {category.description ? <p className="mt-2 text-sm leading-relaxed text-mute">{category.description}</p> : null}
            {category.children.length ? (
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link prefetch={false} href={`/categorie/${child.slug}`} className="text-sm text-mute hover:text-ink">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>
    </Container>
    </>
  );
}
