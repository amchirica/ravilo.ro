import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";
import { getCurrentUser } from "@/server/auth/session";
import { clip, normalizeEmail } from "@/lib/sanitize";

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  guestName: string;
  createdAt: Date | string;
  kind: "PRODUCT" | "STORE";
};

function mapReview(row: {
  id: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase?: boolean;
  guestName?: string;
  createdAt: Date | string;
  reviewKind?: string;
}): PublicReview {
  return {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    verifiedPurchase: Boolean(row.verifiedPurchase),
    guestName: row.guestName || "Client",
    createdAt: row.createdAt,
    kind: row.reviewKind === "STORE" ? "STORE" : "PRODUCT",
  };
}

export async function listApprovedProductReviews(productId: string, take = 20) {
  if (!isSupabaseConfigured()) return [];
  const { data } = await sb()
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false })
    .limit(take);
  return camelList<{
    id: string;
    rating: number;
    title: string;
    body: string;
    verifiedPurchase?: boolean;
    guestName?: string;
    createdAt: Date | string;
    reviewKind?: string;
  }>(data).map(mapReview);
}

export async function listApprovedStoreReviews(take = 8) {
  if (!isSupabaseConfigured()) return [];
  const { data } = await sb().from("reviews").select("*").eq("status", "APPROVED").order("created_at", { ascending: false }).limit(40);
  return camelList<{
    id: string;
    rating: number;
    title: string;
    body: string;
    verifiedPurchase?: boolean;
    guestName?: string;
    createdAt: Date | string;
    reviewKind?: string;
    productId?: string | null;
  }>(data)
    .filter((row) => row.reviewKind === "STORE" || !row.productId)
    .slice(0, take)
    .map(mapReview);
}

export async function reviewDistribution(productId: string) {
  const reviews = await listApprovedProductReviews(productId, 200);
  const buckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const review of reviews) {
    const key = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    buckets[key] += 1;
  }
  return { count: reviews.length, buckets };
}

async function hasVerifiedPurchase(email: string, productId: string, profileId?: string) {
  if (!isSupabaseConfigured()) return false;
  let query = sb()
    .from("orders")
    .select("id, email, profile_id, payment_status, status")
    .in("payment_status", ["PAID", "AUTHORIZED"])
    .in("status", ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);
  if (profileId) query = query.or(`profile_id.eq.${profileId},email.eq.${email}`);
  else query = query.eq("email", email);
  const { data: orders } = await query.limit(50);
  const ids = (orders ?? []).map((row) => row.id as string);
  if (!ids.length) return false;
  const { data: items } = await sb().from("order_items").select("order_id, variant_id").in("order_id", ids);
  const variantIds = [...new Set((items ?? []).map((row) => row.variant_id as string))];
  if (!variantIds.length) return false;
  const { data: variants } = await sb().from("product_variants").select("id, product_id").in("id", variantIds);
  return (variants ?? []).some((row) => row.product_id === productId);
}

export async function submitReview(input: {
  productId?: string;
  kind: "PRODUCT" | "STORE";
  rating: number;
  title: string;
  body: string;
  name: string;
  email: string;
}) {
  if (!isSupabaseConfigured()) throw new Error("Serviciul nu este disponibil.");
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));
  const email = normalizeEmail(input.email);
  const title = clip(input.title, 160);
  const body = clip(input.body, 4000);
  const name = clip(input.name, 80);
  if (!email.includes("@") || body.length < 8 || name.length < 2) {
    throw new Error("Completează recenzia corect.");
  }
  if (input.kind === "PRODUCT" && !input.productId) throw new Error("Produs invalid.");
  const user = await getCurrentUser();
  const verified =
    input.kind === "PRODUCT" && input.productId ? await hasVerifiedPurchase(email, input.productId, user?.id) : false;
  const { error } = await sb().from("reviews").insert({
    product_id: input.kind === "PRODUCT" ? input.productId : null,
    profile_id: user?.id ?? null,
    rating,
    title,
    body,
    status: "PENDING",
    verified_purchase: verified,
    guest_name: name,
    guest_email: email,
    review_kind: input.kind,
  });
  if (error) {
    const { error: fallback } = await sb().from("reviews").insert({
      product_id: input.productId,
      profile_id: user?.id ?? null,
      rating,
      title,
      body,
      status: "PENDING",
      verified_purchase: verified,
    });
    if (fallback) throw new Error("Nu am putut trimite recenzia.");
  }
}
