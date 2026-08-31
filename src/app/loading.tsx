import { Container } from "@/components/ui/primitives";
import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("errors");
  return (
    <Container className="py-24">
      <p className="text-mute">{t("loading")}</p>
    </Container>
  );
}
