import { getCurrentUser } from "@/server/auth/session";
import { sb } from "@/lib/supabase/db";
import { Button, Field, Input } from "@/components/ui/primitives";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { AccountShell } from "@/components/storefront/account-shell";

export default async function ProfilePage() {
  const t = await getTranslations();
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/cont/profil");
  return (
    <AccountShell title={t("account.profile")} current="profile">
      <form action={saveProfile} className="grid max-w-md gap-4">
        <Field label={t("auth.firstName")}>
          <Input name="firstName" defaultValue={user.firstName} />
        </Field>
        <Field label={t("auth.lastName")}>
          <Input name="lastName" defaultValue={user.lastName} />
        </Field>
        <Button type="submit">{t("account.save")}</Button>
      </form>
    </AccountShell>
  );
}

async function saveProfile(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const parsed = z.object({ firstName: z.string().min(1).max(80), lastName: z.string().min(1).max(80) }).parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });
  await sb()
    .from("profiles")
    .update({ first_name: parsed.firstName, last_name: parsed.lastName, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/cont/profil");
}
