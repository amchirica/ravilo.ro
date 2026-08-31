import { adminLoginAction } from "@/server/actions";
import { getAdminUser } from "@/server/auth/session";
import { isStaffRole } from "@/server/rbac";
import { Button, Field, Input } from "@/components/ui/primitives";
import { postAuthPath } from "@/lib/redirect";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AdminLanguageSwitcher } from "@/components/i18n/admin-language-switcher";
import { AdminThemeToggle } from "@/components/theme/admin-theme-toggle";
import { BrandLogo } from "@/components/brand/brand-logo";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; e?: string }>;
}) {
  const { next, e } = await searchParams;
  const user = await getAdminUser();
  if (user && isStaffRole(user.role)) {
    redirect(postAuthPath(next, "/admin"));
  }
  const t = await getTranslations("admin");
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between">
          <BrandLogo href="/" height={40} />
          <div className="flex items-center gap-2">
            <AdminLanguageSwitcher tone="ink" />
            <AdminThemeToggle />
          </div>
        </div>
        <h1 className="mt-6 text-3xl tracking-[-0.03em]">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-mute">{t("loginHint")}</p>
        {e === "1" ? <p className="mt-4 text-sm text-warning">{t("invalidCredentials")}</p> : null}
        {e === "role" ? <p className="mt-4 text-sm text-warning">{t("shopAccount")}</p> : null}
        {e === "session" ? <p className="mt-4 text-sm text-warning">{t("sessionFailed")}</p> : null}
        {e === "rate" ? <p className="mt-4 text-sm text-warning">{t("rateLimited")}</p> : null}
        <form action={adminLoginAction} className="mt-8 grid gap-4">
          <input type="hidden" name="next" value={postAuthPath(next, "/admin")} />
          <Field label={t("email")}>
            <Input name="email" type="email" required autoComplete="username" />
          </Field>
          <Field label={t("password")}>
            <Input name="password" type="password" required autoComplete="current-password" />
          </Field>
          <Button type="submit">{t("enterAdmin")}</Button>
        </form>
        <Link href="/" className="mt-6 inline-block text-xs uppercase tracking-[0.16em] text-mute">
          {t("backToShop")}
        </Link>
      </div>
    </div>
  );
}
