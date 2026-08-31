import { registerAction } from "@/server/actions";
import { Button, Container, Field, Input } from "@/components/ui/primitives";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  const t = await getTranslations("auth");
  return (
    <Container className="max-w-md py-20">
      <h1 className="font-display text-4xl">{t("createAccount")}</h1>
      {e === "exists" ? (
        <p className="mt-4 text-sm text-warning">
          {t("exists")}{" "}
          <Link href="/auth/login?next=/cont" className="underline">
            {t("signIn")}
          </Link>
          .
        </p>
      ) : null}
      {e === "parola" ? <p className="mt-4 text-sm text-warning">{t("passwordPolicy")}</p> : null}
      {e === "1" ? <p className="mt-4 text-sm text-warning">{t("registerFailed")}</p> : null}
      <form action={registerAction} className="mt-8 grid gap-4">
        <Field label={t("firstName")}>
          <Input name="firstName" required autoComplete="given-name" />
        </Field>
        <Field label={t("lastName")}>
          <Input name="lastName" required autoComplete="family-name" />
        </Field>
        <Field label={t("email")}>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label={t("password")}>
          <Input name="password" type="password" required autoComplete="new-password" minLength={12} />
        </Field>
        <p className="text-xs text-mute">{t("passwordHint")}</p>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" name="marketingConsent" />
          {t("marketingOptIn")}
        </label>
        <Button type="submit">{t("createAccount")}</Button>
        <Link href="/auth/login?next=/cont" className="text-sm text-mute">
          {t("haveAccount")}
        </Link>
      </form>
    </Container>
  );
}
