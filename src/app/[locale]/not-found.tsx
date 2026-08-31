import { Container } from "@/components/ui/primitives";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function LocaleNotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-5xl">{t("notFound")}</h1>
      <p className="mt-4 text-mute">{t("notFoundHint")}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/" className="underline underline-offset-4">
          {t("home")}
        </Link>
        <Link href="/produse" className="underline underline-offset-4">
          {t("seeProducts")}
        </Link>
        <Link href="/cautare" className="underline underline-offset-4">
          {t("search")}
        </Link>
      </div>
    </Container>
  );
}
