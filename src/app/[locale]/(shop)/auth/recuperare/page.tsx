import { forgotAction } from "@/server/actions";
import { Button, Container, Field, Input } from "@/components/ui/primitives";
import { getTranslations } from "next-intl/server";

export default async function ForgotPage() {
  const t = await getTranslations("auth");
  return (
    <Container className="max-w-md py-20">
      <h1 className="font-display text-4xl">{t("forgot")}</h1>
      <p className="mt-3 text-sm text-mute">{t("forgotHint")}</p>
      <form action={forgotAction} className="mt-8 grid gap-4">
        <Field label={t("email")}>
          <Input name="email" type="email" required />
        </Field>
        <Button type="submit">{t("sendLink")}</Button>
      </form>
    </Container>
  );
}
