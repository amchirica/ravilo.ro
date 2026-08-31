import "server-only";
import { z } from "zod";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { clip, normalizeEmail } from "@/lib/sanitize";
import { readUploadedFiles, storeUpload } from "@/services/storage";
import { enqueueEmail } from "@/services/email";
import { getStoreSettings } from "@/services/settings";
import { writeAudit } from "@/server/audit";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

const REASONS = ["WITHDRAWAL", "DEFECT", "WRONG_ITEM", "DAMAGED", "WARRANTY", "OTHER"] as const;
const RESOLUTIONS = ["REFUND", "EXCHANGE", "STORE_CREDIT", "REPAIR"] as const;
const METHODS = ["CUSTOMER_SHIP", "COURIER_PICKUP"] as const;
const NEEDS_PHOTOS = new Set(["DEFECT", "WRONG_ITEM", "DAMAGED", "WARRANTY"]);

const schema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(8).max(40),
  orderNumber: z.string().trim().min(3).max(40),
  productName: z.string().trim().max(160).optional(),
  sku: z.string().trim().max(64).optional(),
  quantity: z.coerce.number().int().min(1).max(20),
  reason: z.enum(REASONS),
  resolution: z.enum(RESOLUTIONS),
  packageOpened: z.enum(["yes", "no"]),
  unused: z.enum(["yes", "no"]),
  iban: z
    .string()
    .trim()
    .optional()
    .transform((value) => value?.replace(/\s+/g, "").toUpperCase() || undefined)
    .refine((value) => !value || /^RO[0-9A-Z]{22}$/.test(value), "IBAN românesc invalid"),
  ibanHolder: z.string().trim().max(120).optional(),
  street: z.string().trim().min(1).max(120),
  streetNumber: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(80),
  county: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().min(4).max(12),
  returnMethod: z.enum(METHODS),
  description: z.string().trim().min(12).max(4000),
  consent: z.literal("on"),
  website: z.string().max(0).optional(),
});

export class ReturnRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnRequestError";
  }
}

export async function submitReturnRequest(formData: FormData, input: { ip: string; profileId?: string | null }) {
  if (String(formData.get("website") ?? "")) return { ok: true as const, ignored: true };
  const limited = await rateLimit("returns", input.ip, RATE_LIMITS.returns.limit, RATE_LIMITS.returns.windowSec);
  if (!limited.success) throw new ReturnRequestError("Prea multe cereri. Încearcă mai târziu.");
  const parsed = schema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    orderNumber: formData.get("orderNumber"),
    productName: String(formData.get("productName") ?? "") || undefined,
    sku: String(formData.get("sku") ?? "") || undefined,
    quantity: formData.get("quantity") ?? 1,
    reason: formData.get("reason"),
    resolution: formData.get("resolution"),
    packageOpened: formData.get("packageOpened"),
    unused: formData.get("unused"),
    iban: String(formData.get("iban") ?? "") || undefined,
    ibanHolder: String(formData.get("ibanHolder") ?? "") || undefined,
    street: formData.get("street"),
    streetNumber: formData.get("streetNumber"),
    city: formData.get("city"),
    county: formData.get("county"),
    postalCode: formData.get("postalCode"),
    returnMethod: formData.get("returnMethod"),
    description: formData.get("description"),
    consent: formData.get("consent") === "on" ? "on" : "",
    website: String(formData.get("website") ?? ""),
  });
  if (parsed.resolution === "REFUND" && (!parsed.iban || !parsed.ibanHolder)) {
    throw new ReturnRequestError("Pentru rambursare avem nevoie de IBAN.");
  }
  const photos = readUploadedFiles(formData, "photos").slice(0, 6);
  if (NEEDS_PHOTOS.has(parsed.reason) && photos.length === 0) {
    throw new ReturnRequestError("Încarcă cel puțin o poză cu produsul / defectul.");
  }
  if (!isSupabaseConfigured()) return { ok: true as const, ignored: false };
  const orderNumber = clip(parsed.orderNumber, 40).toUpperCase();
  const email = normalizeEmail(parsed.email);
  const { data: order } = await sb()
    .from("orders")
    .select("id, email, public_order_number")
    .ilike("public_order_number", orderNumber)
    .maybeSingle();
  const orderMatch = order && normalizeEmail(order.email) === email ? order.id : null;
  await ensureReturnsBucket();
  const photoUrls: string[] = [];
  for (const file of photos) {
    try {
      const uploaded = await storeUpload(file, { bucket: "returns", folder: "rma", alt: `Retur ${orderNumber}` });
      photoUrls.push(uploaded.storagePath);
    } catch {
      try {
        const uploaded = await storeUpload(file, { bucket: "cms", folder: "returns", alt: `Retur ${orderNumber}` });
        photoUrls.push(uploaded.storagePath);
      } catch {
        /* keep going; we fail below if none landed */
      }
    }
  }
  if (photos.length && photoUrls.length === 0) {
    throw new ReturnRequestError("Încarcă cel puțin o poză cu produsul / defectul.");
  }
  const { data: created, error } = await sb()
    .from("return_requests")
    .insert({
      profile_id: input.profileId ?? null,
      order_id: orderMatch,
      public_order_number: orderNumber,
      email,
      phone: clip(parsed.phone, 40),
      first_name: clip(parsed.firstName, 80),
      last_name: clip(parsed.lastName, 80),
      product_name: clip(parsed.productName ?? "", 160),
      sku: clip(parsed.sku ?? "", 64),
      quantity: parsed.quantity,
      reason: parsed.reason,
      resolution: parsed.resolution,
      package_opened: parsed.packageOpened === "yes",
      unused: parsed.unused === "yes",
      iban: parsed.iban ?? null,
      iban_holder: clip(parsed.ibanHolder ?? "", 120),
      street: clip(parsed.street, 120),
      street_number: clip(parsed.streetNumber, 20),
      city: clip(parsed.city, 80),
      county: clip(parsed.county, 80),
      postal_code: clip(parsed.postalCode, 12),
      return_method: parsed.returnMethod,
      description: clip(parsed.description, 4000),
      photo_urls: photoUrls,
      status: "PENDING",
    })
    .select("id")
    .single();
  const createdId = await resolveReturnRequestId(created?.id, error, {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email,
    phone: parsed.phone,
    orderNumber,
    reason: parsed.reason,
    resolution: parsed.resolution,
    description: parsed.description,
    photoUrls,
  });
  const settings = await getStoreSettings();
  await enqueueEmail(email, "return_received", {
    firstName: parsed.firstName,
    orderNumber,
    requestId: createdId,
  });
  if (settings.email) {
    await enqueueEmail(settings.email, "return_received_admin", {
      orderNumber,
      email,
      reason: parsed.reason,
      requestId: createdId,
    });
  }
  await writeAudit({
    actorUserId: input.profileId ?? null,
    action: "return.request",
    entityType: "ReturnRequest",
    entityId: createdId,
    after: { orderNumber, reason: parsed.reason },
  });
  return { ok: true as const, ignored: false, id: createdId };
}

async function ensureReturnsBucket() {
  const { error } = await sb().storage.createBucket("returns", {
    public: true,
    fileSizeLimit: "8388608",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    /* cms fallback still handles upload */
  }
}

async function resolveReturnRequestId(
  id: string | undefined,
  error: { code?: string; message?: string } | null,
  fallback: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    orderNumber: string;
    reason: string;
    resolution: string;
    description: string;
    photoUrls: string[];
  },
) {
  if (id) return id;
  const missing = error?.code === "PGRST205" || /return_requests/i.test(error?.message ?? "");
  if (!missing) throw new ReturnRequestError(error?.message ?? "Nu am putut trimite cererea.");
  const { data } = await sb()
    .from("contact_submissions")
    .insert({
      name: `${fallback.firstName} ${fallback.lastName}`.trim(),
      email: fallback.email,
      phone: fallback.phone,
      subject: `RETUR ${fallback.orderNumber}`,
      message: [
        `Motiv: ${fallback.reason}`,
        `Rezolvare: ${fallback.resolution}`,
        fallback.description,
        fallback.photoUrls.length ? `Poze:\n${fallback.photoUrls.join("\n")}` : "Fără poze.",
      ].join("\n\n"),
    })
    .select("id")
    .maybeSingle();
  return data?.id ?? "retur";
}
