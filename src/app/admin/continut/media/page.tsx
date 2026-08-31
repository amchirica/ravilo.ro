import { requirePermission } from "@/server/auth/session";
import { listRows, sb } from "@/lib/supabase/db";
import { storeUpload, removeOrphanObject, readUploadedFile } from "@/services/storage";
import { writeAudit } from "@/server/audit";
import { revalidatePath } from "next/cache";
import { FileUploadForm } from "@/components/admin/file-upload-form";
import { AdminHeading } from "@/components/admin/admin-heading";
import { getTranslations } from "next-intl/server";

type Asset = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  bucket: string;
  path: string;
};

export default async function MediaAdmin() {
  await requirePermission("content.write");
  const assets = await listRows<Asset>("media_assets", { order: "created_at", ascending: false, limit: 80 });
  const t = await getTranslations("admin");
  return (
    <div>
      <AdminHeading k="media" />
      <p className="mt-2 text-sm text-mute">{t("mediaHint")}</p>
      <div className="mt-6">
        <FileUploadForm
          action={uploadMedia}
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4"
          label={t("file")}
          submitLabel={t("upload")}
        />
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {assets.map((asset) => (
          <li key={asset.id} className="border border-line bg-card p-3 text-sm">
            {asset.mimeType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.storagePath} alt={asset.originalName} className="mb-2 h-32 w-full object-cover" />
            ) : null}
            <p>{asset.originalName}</p>
            <p className="text-mute">
              {asset.mimeType} · {asset.sizeBytes} bytes
            </p>
            <form action={deleteMedia.bind(null, asset.id, asset.bucket, asset.path)}>
              <button className="mt-2 text-xs underline">{t("delete")}</button>
            </form>
          </li>
        ))}
        {assets.length === 0 ? <li>{t("emptyMedia")}</li> : null}
      </ul>
    </div>
  );
}

async function uploadMedia(formData: FormData) {
  "use server";
  const actor = await requirePermission("content.write");
  let file: File;
  try {
    file = readUploadedFile(formData);
  } catch {
    return;
  }
  await storeUpload(file, { bucket: "cms", createdBy: actor.id });
  await writeAudit({ actorUserId: actor.id, action: "media.upload", entityType: "MediaAsset", entityId: actor.id });
  revalidatePath("/admin/continut/media");
}

async function deleteMedia(id: string, bucket: string, path: string) {
  "use server";
  const actor = await requirePermission("content.write");
  const { count } = await sb().from("product_media").select("id", { count: "exact", head: true }).eq("asset_id", id);
  await sb().from("media_assets").delete().eq("id", id);
  await removeOrphanObject(bucket, path, (count ?? 0) > 0);
  await writeAudit({ actorUserId: actor.id, action: "media.delete", entityType: "MediaAsset", entityId: id });
  revalidatePath("/admin/continut/media");
}
