import { getPublishedPage } from "@/services/cms";
import { Button, Container } from "@/components/ui/primitives";
import { EditorialHero } from "@/components/storefront/editorial-hero";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/lib/i18n";

export async function AboutRavilo({ locale }: { locale: AppLocale }) {
  const t = await getTranslations("legal");
  const page = await getPublishedPage("despre", locale);
  const title = t("aboutH1");
  const how = [t("aboutHow1"), t("aboutHow2"), t("aboutHow3"), t("aboutHow4")];
  return (
    <article>
      <EditorialHero
        title={title}
        description={page?.excerpt || t("aboutIntro")}
        image={page?.coverUrl}
        imageAlt={title}
      />
      <Container className="max-w-3xl pb-10">
        <div className="space-y-6 text-lg leading-relaxed text-ink-2">
          <p>{t("aboutP2")}</p>
          <p>{t("aboutP3")}</p>
        </div>
      </Container>
      <section className="bg-surface">
        <Container className="max-w-3xl py-16 md:py-20">
          <h2 className="font-display text-3xl tracking-[-0.03em] md:text-4xl">{t("aboutHowTitle")}</h2>
          <ul className="mt-8 grid gap-4">
            {how.map((item) => (
              <li key={item} className="border-t border-line pt-4 text-lg text-ink-2">
                {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section>
        <Container className="max-w-3xl py-16 md:py-24">
          <h2 className="font-display text-3xl tracking-[-0.03em] md:text-4xl">{t("aboutFinalTitle")}</h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-mute">{t("aboutFinalBody")}</p>
          <Button href="/produse" className="mt-10">
            {t("aboutCta")}
          </Button>
        </Container>
      </section>
    </article>
  );
}
