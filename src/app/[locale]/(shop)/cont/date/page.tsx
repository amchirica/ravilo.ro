import { getCurrentUser } from "@/server/auth/session";
import { listRows } from "@/lib/supabase/db";
import { Button } from "@/components/ui/primitives";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { redirect as shopRedirect } from "@/i18n/routing";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/format";
import { logout } from "@/services/auth";
import { createAndFulfill, DataRequestError, type DataRequestRow } from "@/services/data-requests";
import { AccountShell } from "@/components/storefront/account-shell";
import type { AppLocale } from "@/lib/i18n";

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const t = await getTranslations("account");
  const locale = (await getLocale()) as AppLocale;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) shopRedirect({ href: "/auth/login?next=/cont/date", locale });
  if (!user) return null;
  const rows = await listRows<DataRequestRow>("data_requests", {
    eq: ["profile_id", user.id],
    order: "created_at",
    ascending: false,
  });
  const pendingDeletion = rows.some((row) => row.type === "DELETION" && (row.status === "PENDING" || row.status === "PROCESSING"));
  return (
    <AccountShell title={t("dataTitle")} current="privacy">
      <p className="text-sm text-mute">{t("dataHint")}</p>
      {e === "staff" ? <p className="mt-4 text-sm text-warning">{t("staffCannotDelete")}</p> : null}
      {e === "fail" ? <p className="mt-4 text-sm text-warning">{t("requestFailed")}</p> : null}
      <form action={exportData} className="mt-6">
        <Button type="submit" variant="line">
          {t("requestExport")}
        </Button>
      </form>
      <ConfirmForm action={deleteAccount} message={t("confirmDeletion")}>
        <Button type="submit" variant="line" className="mt-3">
          {pendingDeletion ? t("fulfillDeletion") : t("requestDeletion")}
        </Button>
      </ConfirmForm>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download from API, not a page */}
      <a href="/api/account/export" className="mt-4 inline-block text-sm underline">
        {t("downloadExport")}
      </a>
      <ul className="mt-8 grid gap-2 text-sm text-mute">
        {rows.map((row) => (
          <li key={row.id}>
            {row.type === "DELETION" ? t("requestTypeDeletion") : t("requestTypeExport")}
            {" · "}
            {row.status === "PENDING"
              ? t("requestStatusPending")
              : row.status === "PROCESSING"
                ? t("requestStatusProcessing")
                : row.status === "COMPLETED"
                  ? t("requestStatusCompleted")
                  : t("requestStatusRejected")}
            {" · "}
            {formatDate(row.createdAt, locale)}
          </li>
        ))}
        {rows.length === 0 ? <li>{t("emptyRequests")}</li> : null}
      </ul>
    </AccountShell>
  );
}

async function exportData() {
  "use server";
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) {
    shopRedirect({ href: "/auth/login", locale });
    return;
  }
  try {
    await createAndFulfill(user.id, "EXPORT", user.id);
  } catch {
    shopRedirect({ href: "/cont/date?e=fail", locale });
    return;
  }
  shopRedirect({ href: "/cont/date?e=exported", locale });
}

async function deleteAccount() {
  "use server";
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) {
    shopRedirect({ href: "/auth/login", locale });
    return;
  }
  try {
    await createAndFulfill(user.id, "DELETION", user.id);
  } catch (error) {
    const staff = error instanceof DataRequestError && error.message.includes("echipă");
    shopRedirect({ href: staff ? "/cont/date?e=staff" : "/cont/date?e=fail", locale });
    return;
  }
  await logout("shop");
  revalidatePath("/cont/date");
  shopRedirect({ href: "/", locale });
}
