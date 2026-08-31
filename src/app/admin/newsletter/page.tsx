import { requirePermission } from "@/server/auth/session";
import { listRows } from "@/lib/supabase/db";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getTranslations } from "next-intl/server";

type Sub = { id: string; email: string; status: string; source: string; createdAt: string };

export default async function NewsletterAdmin() {
  await requirePermission("content.read");
  const rows = await listRows<Sub>("newsletter_subscribers", { order: "created_at", ascending: false, limit: 200 });
  const t = await getTranslations("admin");
  return (
    <div>
      <AdminHeading k="newsletter" />
      <p className="mt-2 text-sm text-mute">{t("subscribers", { count: rows.length })}</p>
      <ul className="mt-6 divide-y divide-line text-sm">
        {rows.map((row) => (
          <li key={row.id} className="flex justify-between py-3">
            <span>{row.email}</span>
            <span className="text-mute">
              {row.status} · {row.source}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
