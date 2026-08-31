import { resetAction } from "@/server/actions";
import { Button, Container, Field, Input } from "@/components/ui/primitives";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) notFound();
  const t = await getTranslations("auth");
  return (
    <Container className="max-w-md py-20">
      <h1 className="font-display text-4xl">{t("reset")}</h1>
      <form action={resetAction} className="mt-8 grid gap-4">
        <input type="hidden" name="token" value={token} />
        <Field label={t("newPassword")}>
          <Input name="password" type="password" required autoComplete="new-password" />
        </Field>
        <Button type="submit">{t("save")}</Button>
      </form>
    </Container>
  );
}
