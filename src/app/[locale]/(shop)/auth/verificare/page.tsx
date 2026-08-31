import { verifyAction } from "@/server/actions";
import { Container } from "@/components/ui/primitives";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ nou?: string }> }) {
  const t = await getTranslations("auth");
  const { nou } = await searchParams;
  let message = nou ? t("verifySent") : t("verifyDefault");
  try {
    await verifyAction();
    message = t("verifyOk");
  } catch {
    if (!nou) message = t("verifyLogin");
  }
  return (
    <Container className="max-w-md py-20">
      <h1 className="font-display text-4xl">{t("verify")}</h1>
      <p className="mt-4 text-mute">{message}</p>
      <Link href="/auth/login?next=/cont" className="mt-8 inline-block text-sm underline">
        {t("goLogin")}
      </Link>
    </Container>
  );
}
