import "server-only";
import { randomToken } from "@/lib/crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sb } from "@/lib/supabase/db";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "video/mp4"]);
const MAX_BYTES = 8 * 1024 * 1024;
const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  mp4: "video/mp4",
};

export function readUploadedFiles(formData: FormData, name = "photos"): File[] {
  const files: File[] = [];
  for (const value of formData.getAll(name)) {
    if (!value || typeof value === "string") continue;
    const blob = value as Blob & { name?: string; type?: string };
    if (typeof blob.arrayBuffer !== "function" || !blob.size) continue;
    if (typeof File !== "undefined" && value instanceof File) {
      files.push(value);
      continue;
    }
    files.push(new File([blob], blob.name || "upload", { type: blob.type || "" }));
  }
  return files;
}

export function readUploadedFile(formData: FormData, name = "file"): File {
  const files = readUploadedFiles(formData, name);
  if (!files[0]) throw new Error("Alege un fișier.");
  return files[0];
}

function sniffUploadMime(file: File, buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    if (["isom", "iso2", "mp41", "mp42", "m4v ", "msnv", "avc1"].includes(brand) || brand.startsWith("mp4")) {
      return "video/mp4";
    }
  }
  if (ALLOWED.has(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? file.type;
}

const MAGIC: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

export type StorageBucket = "products" | "cms" | "journal" | "avatars" | "returns";

export function assertSafeUpload(file: File, buffer: Buffer) {
  if (!ALLOWED.has(file.type)) throw new Error("Tip de fișier nepermis. Folosește JPEG, PNG, WebP sau AVIF.");
  if (file.size > MAX_BYTES || buffer.length > MAX_BYTES) throw new Error("Fișier prea mare (max 8 MB).");
  if (file.name.toLowerCase().endsWith(".svg") || file.type === "image/svg+xml") {
    throw new Error("SVG nu este permis");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["exe", "js", "html", "htm", "svg", "xml", "php"].includes(ext)) {
    throw new Error("Extensie nepermisă");
  }
  const signatures = MAGIC[file.type];
  if (signatures && !signatures.some((sig) => sig.every((byte, index) => buffer[index] === byte))) {
    if (file.type === "image/jpeg" || file.type === "image/png") {
      throw new Error("Conținutul fișierului nu corespunde tipului declarat");
    }
  }
}

export function publicStorageUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return path;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

export async function storeUpload(
  file: File,
  input: { bucket: StorageBucket; createdBy?: string; alt?: string; folder?: string },
): Promise<{ storagePath: string; mimeType: string; sizeBytes: number; assetId: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length) throw new Error("Alege un fișier.");
  const mimeType = sniffUploadMime(file, buffer);
  const safeName = file.name || `upload.${mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1]}`;
  const normalized = new File([buffer], safeName, { type: mimeType });
  assertSafeUpload(normalized, buffer);
  const ext = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  const key = `${input.folder ? `${input.folder}/` : ""}${randomToken(16)}.${ext}`;
  const admin = createAdminSupabase();
  const { error } = await admin.storage.from(input.bucket).upload(key, buffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload eșuat");
  const storagePath = publicStorageUrl(input.bucket, key);
  const { data: asset, error: dbError } = await sb()
    .from("media_assets")
    .insert({
      bucket: input.bucket,
      path: key,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: buffer.length,
      alt: input.alt ?? "",
      original_name: safeName.slice(0, 180),
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (dbError || !asset) throw new Error(dbError?.message || "Upload eșuat");
  return { storagePath, mimeType, sizeBytes: buffer.length, assetId: asset.id };
}

export async function removeOrphanObject(bucket: string, path: string, stillReferenced: boolean) {
  if (stillReferenced) return;
  const admin = createAdminSupabase();
  await admin.storage.from(bucket).remove([path]);
}
