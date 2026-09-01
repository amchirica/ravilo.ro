import { requirePermission } from "@/server/auth/session";
import { listRows, sb } from "@/lib/supabase/db";
import { AdminHeading } from "@/components/admin/admin-heading";
import { ConfirmForm } from "@/components/admin/confirm-form";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
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
          <li key={row.id} className="flex items-center justify-between gap-4 py-3">
            <span>{row.email}</span>
            <span className="flex items-center gap-3 text-mute">
              {row.status} · {row.source}
              <ConfirmForm action={deleteSubscriber.bind(null, row.id)} message="Ștergi abonatul din listă?">
                <button className="text-xs text-danger underline">Șterge</button>
              </ConfirmForm>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function deleteSubscriber(id: string) {
  "use server";
  const actor = await requirePermission("content.write");
  await sb().from("newsletter_subscribers").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "newsletter.delete", entityType: "NewsletterSubscriber", entityId: id });
  revalidatePath("/admin/newsletter");
}
