import { getCurrentUser } from "@/server/auth/session";
import { listRows } from "@/lib/supabase/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccountShell } from "@/components/storefront/account-shell";
import { EmptyState } from "@/components/storefront/empty-state";

export default async function AddressesPage() {
  const t = await getTranslations("account");
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/cont/adrese");
  const rows = await listRows<{
    id: string;
    firstName: string;
    lastName: string;
    street: string;
    number: string;
    city: string;
  }>("addresses", { eq: ["profile_id", user.id] });
  return (
    <AccountShell title={t("addresses")} current="addresses">
      <p className="mb-8 text-sm text-mute">{t("addressesHint")}</p>
      {rows.length === 0 ? (
        <EmptyState title={t("emptyAddresses")} />
      ) : (
        <ul>
          {rows.map((address) => (
            <li key={address.id} className="border-t border-line py-5 text-sm">
              {address.firstName} {address.lastName}, {address.street} {address.number}, {address.city}
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
