import { requirePermission } from "@/server/auth/session";
import { AdminHeading } from "@/components/admin/admin-heading";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

type ReviewRow = {
  id: string;
  rating: number;
  status: string;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  guestName?: string;
  reviewKind?: string;
  product: { name: string } | null;
};

async function moderate(id: string, status: "APPROVED" | "REJECTED" | "ARCHIVED") {
  "use server";
  const actor = await requirePermission("review.moderate");
  await sb()
    .from("reviews")
    .update({
      status,
      moderator_id: actor.id,
      approved_at: status === "APPROVED" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "review.moderate", entityType: "Review", entityId: id, after: { status } });
  revalidatePath("/admin/recenzii");
}

async function removeReview(id: string) {
  "use server";
  const actor = await requirePermission("review.moderate");
  await sb().from("reviews").delete().eq("id", id);
  await writeAudit({ actorUserId: actor.id, action: "review.delete", entityType: "Review", entityId: id });
  revalidatePath("/admin/recenzii");
}

export default async function ReviewsAdmin({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePermission("review.moderate");
  const { tab = "all" } = await searchParams;
  const { data } = isSupabaseConfigured()
    ? await sb().from("reviews").select("*, product:products(name)").order("created_at", { ascending: false }).limit(80)
    : { data: [] };
  const rows = camelList<ReviewRow>(data).filter((review) => {
    if (tab === "pending") return review.status === "PENDING";
    if (tab === "approved") return review.status === "APPROVED";
    if (tab === "rejected") return review.status === "REJECTED";
    if (tab === "verified") return review.verifiedPurchase;
    return true;
  });
  const t = await getTranslations("admin");
  const tabs = [
    ["all", t("all")],
    ["pending", t("pending")],
    ["approved", t("approved")],
    ["rejected", t("rejected")],
    ["verified", t("verifiedPurchases")],
  ] as const;
  return (
    <div>
      <AdminHeading k="reviews" />
      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        {tabs.map(([id, label]) => (
          <Link key={id} href={`/admin/recenzii?tab=${id}`} className={tab === id ? "underline" : "text-mute"}>
            {label}
          </Link>
        ))}
      </div>
      <ul className="mt-6 space-y-4">
        {rows.map((review) => (
          <li key={review.id} className="border border-line p-4">
            <p className="text-sm text-mute">
              {review.product?.name || t("store")} · {review.guestName || ""} · {review.rating}/5 · {review.status}{" "}
              {review.verifiedPurchase ? `· ${t("verified")}` : ""}
            </p>
            <p className="mt-1 font-medium">{review.title}</p>
            <p className="mt-2">{review.body}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <form action={moderate.bind(null, review.id, "APPROVED")}>
                <button className="underline">{t("approve")}</button>
              </form>
              <form action={moderate.bind(null, review.id, "REJECTED")}>
                <button className="underline">{t("reject")}</button>
              </form>
              <form action={moderate.bind(null, review.id, "ARCHIVED")}>
                <button className="underline">{t("archive")}</button>
              </form>
              <form action={removeReview.bind(null, review.id)}>
                <button className="text-danger underline">{t("delete")}</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
