import { getAdminUser } from "@/server/auth/session";
import { logoutAction } from "@/server/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminForbiddenPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");
  const t = await getTranslations("admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-mute">403</p>
        <h1 className="mt-3 font-serif text-4xl">{t("forbiddenTitle")}</h1>
        <p className="mt-4 text-mute">{t("forbiddenHint")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/admin" className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm">
            {t("dashboard")}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm text-paper">
              {t("logoutAdmin")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
