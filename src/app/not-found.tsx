import { Button, Container } from "@/components/ui/primitives";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-4 font-display text-5xl tracking-[-0.04em]">{t("pageTitle")}</h1>
      <p className="mx-auto mt-4 max-w-md text-mute">{t("notFoundHint")}</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button href="/">{t("home")}</Button>
        <Button href="/produse" variant="line">
          {t("seeProducts")}
        </Button>
        <Button href="/cautare" variant="line">
          {t("search")}
        </Button>
      </div>
    </Container>
  );
}
