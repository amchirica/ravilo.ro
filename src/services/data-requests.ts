import "server-only";
import { sb } from "@/lib/supabase/db";
import { writeAudit } from "@/server/audit";
import { isStaffRole } from "@/server/rbac";
import type { UserRole } from "@/types/domain";

export type DataRequestType = "EXPORT" | "DELETION";
export type DataRequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";

export type DataRequestRow = {
  id: string;
  profileId: string;
  type: DataRequestType;
  status: DataRequestStatus;
  payloadPath: string | null;
  createdAt: Date | string;
  completedAt: Date | string | null;
};

class DataRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataRequestError";
  }
}

async function loadProfile(profileId: string) {
  const { data, error } = await sb()
    .from("profiles")
    .select("id, email, first_name, last_name, phone, role, status, marketing_consent, preferred_language")
    .eq("id", profileId)
    .maybeSingle();
  if (error || !data) throw new DataRequestError("Contul nu a fost găsit.");
  return data;
}

async function mark(
  id: string,
  status: DataRequestStatus,
  extra?: { payloadPath?: string | null },
) {
  const { error } = await sb()
    .from("data_requests")
    .update({
      status,
      payload_path: extra?.payloadPath ?? undefined,
      completed_at: status === "COMPLETED" || status === "REJECTED" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw new DataRequestError(error.message);
}

export async function findOpenRequest(profileId: string, type: DataRequestType) {
  const { data } = await sb()
    .from("data_requests")
    .select("id, status")
    .eq("profile_id", profileId)
    .eq("type", type)
    .in("status", ["PENDING", "PROCESSING"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function collectExportPayload(profileId: string) {
  const profile = await loadProfile(profileId);
  const [addresses, orders, reviews, wishlist, consents] = await Promise.all([
    sb().from("addresses").select("type, first_name, last_name, company, country, county, city, street, number, postal_code, phone, is_default").eq("profile_id", profileId),
    sb().from("orders").select("id, public_order_number, status, payment_status, grand_total, currency, email, phone, created_at, billing_address_snapshot, shipping_address_snapshot").eq("profile_id", profileId),
    sb().from("reviews").select("product_id, rating, title, body, status, created_at").eq("profile_id", profileId),
    sb().from("wishlist_items").select("product_id, created_at").eq("profile_id", profileId),
    sb().from("consent_records").select("category, granted, source, version, created_at").eq("profile_id", profileId),
  ]);
  const orderRows = orders.data ?? [];
  const orderIds = orderRows.map((order) => order.id);
  const { data: itemRows } =
    orderIds.length > 0
      ? await sb()
          .from("order_items")
          .select("order_id, sku, product_name, variant_name, quantity, unit_price, line_total")
          .in("order_id", orderIds)
      : { data: [] as { order_id: string }[] };
  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone,
      language: profile.preferred_language,
      marketingConsent: profile.marketing_consent,
    },
    addresses: addresses.data ?? [],
    orders: orderRows.map((order) => ({
      number: order.public_order_number,
      status: order.status,
      paymentStatus: order.payment_status,
      grandTotal: order.grand_total,
      currency: order.currency,
      email: order.email,
      phone: order.phone,
      createdAt: order.created_at,
      billing: order.billing_address_snapshot,
      shipping: order.shipping_address_snapshot,
      items: (itemRows ?? []).filter((item) => item.order_id === order.id),
    })),
    reviews: reviews.data ?? [],
    wishlist: wishlist.data ?? [],
    consents: consents.data ?? [],
  };
}

export async function fulfillExport(requestId: string, profileId: string, actorId?: string) {
  const payload = await collectExportPayload(profileId);
  await mark(requestId, "COMPLETED", { payloadPath: "inline" });
  await writeAudit({
    actorUserId: actorId ?? profileId,
    action: "privacy.export",
    entityType: "DataRequest",
    entityId: requestId,
    after: { profileId },
  });
  return payload;
}

export async function fulfillDeletion(requestId: string, profileId: string, actorId?: string) {
  const profile = await loadProfile(profileId);
  if (isStaffRole(profile.role as UserRole)) {
    await mark(requestId, "REJECTED");
    throw new DataRequestError("Conturile de echipă nu se șterg din magazin. Folosește Admin → Utilizatori.");
  }
  await mark(requestId, "PROCESSING");
  const email = profile.email?.trim().toLowerCase();
  await sb().from("wishlist_items").delete().eq("profile_id", profileId);
  await sb().from("addresses").delete().eq("profile_id", profileId);
  await sb().from("consent_records").delete().eq("profile_id", profileId);
  if (email) {
    await sb().from("newsletter_subscribers").update({ status: "unsubscribed" }).eq("email", email);
  }
  await sb().from("reviews").update({ profile_id: null }).eq("profile_id", profileId);
  await sb()
    .from("orders")
    .update({ profile_id: null })
    .eq("profile_id", profileId);
  const anonymized = `deleted-${profileId.slice(0, 8)}@anonymized.invalid`;
  const { error: profileError } = await sb()
    .from("profiles")
    .update({
      email: anonymized,
      first_name: "Șters",
      last_name: "GDPR",
      phone: null,
      marketing_consent: false,
      marketing_consent_at: null,
      status: "DISABLED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);
  if (profileError) throw new DataRequestError(profileError.message);
  const { error: authError } = await sb().auth.admin.deleteUser(profileId);
  if (authError) {
    await sb().auth.admin.updateUserById(profileId, { email: anonymized }).catch(() => undefined);
  }
  await sb()
    .from("data_requests")
    .update({ status: "REJECTED", completed_at: new Date().toISOString() })
    .eq("profile_id", profileId)
    .eq("type", "DELETION")
    .eq("status", "PENDING")
    .neq("id", requestId);
  await mark(requestId, "COMPLETED", { payloadPath: "anonymized" });
  await writeAudit({
    actorUserId: actorId ?? profileId,
    action: "privacy.delete",
    entityType: "Profile",
    entityId: profileId,
    after: { requestId, fiscalOrdersRetained: true },
  });
}

export async function createAndFulfill(profileId: string, type: DataRequestType, actorId?: string) {
  const profile = await loadProfile(profileId);
  if (type === "DELETION" && isStaffRole(profile.role as UserRole)) {
    throw new DataRequestError("Conturile de echipă nu se șterg din magazin.");
  }
  const open = await findOpenRequest(profileId, type);
  let requestId = open?.id;
  if (!requestId) {
    const { data, error } = await sb()
      .from("data_requests")
      .insert({ profile_id: profileId, type, status: "PENDING" })
      .select("id")
      .single();
    if (error || !data) throw new DataRequestError(error?.message ?? "Nu am putut înregistra cererea.");
    requestId = data.id;
  }
  if (type === "EXPORT") {
    return fulfillExport(requestId, profileId, actorId);
  }
  await fulfillDeletion(requestId, profileId, actorId);
  return null;
}

export { DataRequestError };
