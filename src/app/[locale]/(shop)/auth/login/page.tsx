import { Link } from "@/i18n/routing";
import { loginAction } from "@/server/actions";
import { Button, Container, Field, Input } from "@/components/ui/primitives";
import { postAuthPath } from "@/lib/redirect";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(postAuthPath(next, "/cont"));
  const t = await getTranslations("auth");
  return (
    <Container className="max-w-md py-20">
      <h1 className="font-display text-4xl">{t("login")}</h1>
      {e === "confirm" ? <p className="mt-4 text-sm text-warning">{t("confirmEmail")}</p> : null}
      {e === "rate" ? <p className="mt-4 text-sm text-warning">{t("rateLimited")}</p> : null}
      {e === "1" ? <p className="mt-4 text-sm text-warning">{t("invalidCredentials")}</p> : null}
      <form action={loginAction} className="mt-8 grid gap-4">
        <input type="hidden" name="next" value={postAuthPath(next, "/cont")} />
        <Field label={t("email")}>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label={t("password")}>
          <Input name="password" type="password" required autoComplete="current-password" />
        </Field>
        <Button type="submit">{t("login")}</Button>
        <Link href="/auth/inregistrare" className="text-sm text-mute">
          {t("register")}
        </Link>
        <Link href="/auth/recuperare" className="text-sm text-mute">
          {t("forgot")}
        </Link>
      </form>
    </Container>
  );
}
