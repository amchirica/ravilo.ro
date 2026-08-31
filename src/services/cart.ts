import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys } from "@/lib/supabase/rows";
import { COOKIES, getCookie, setCookie } from "@/server/http";
import { getCurrentUser } from "@/server/auth/session";
import { sha256, randomToken } from "@/lib/crypto";
import { cartItemSchema } from "@/schemas/commerce";
import { quoteCart } from "@/services/pricing";

const CART_TTL_SEC = 60 * 60 * 24 * 30;

type CartRow = { id: string; profileId: string | null; guestTokenHash: string | null };
type CartItemRow = { id: string; cartId: string; variantId: string; quantity: number };

const EMPTY_CART = { cartId: "", items: [] as CartItemRow[], quote: null as Awaited<ReturnType<typeof quoteCart>> | null };

/** Read-only. Safe in Server Components. Never writes cookies. */
export async function readGuestToken(): Promise<string | undefined> {
  return getCookie(COOKIES.cart);
}

/** Writes the guest cart cookie. Call only from a Server Action or Route Handler. */
export async function createGuestToken(): Promise<string> {
  const existing = await readGuestToken();
  if (existing) return existing;
  const token = randomToken(24);
  await setCookie(COOKIES.cart, token, CART_TTL_SEC);
  return token;
}

async function loadGuestCart(token: string) {
  const { data: existing } = await sb().from("carts").select("*").eq("guest_token_hash", sha256(token)).maybeSingle();
  return existing ? camelKeys<CartRow>(existing) : null;
}

/** Read-only cart lookup. No cookie mutation, no insert. */
export async function getExistingCart() {
  if (!isSupabaseConfigured()) return null;
  const user = await getCurrentUser();
  if (user) {
    const { data: existing } = await sb().from("carts").select("*").eq("profile_id", user.id).maybeSingle();
    return existing ? camelKeys<CartRow>(existing) : null;
  }
  const token = await readGuestToken();
  if (!token) return null;
  return loadGuestCart(token);
}

/** Creates a cart (and guest cookie if needed). Server Action / Route Handler only. */
export async function getOrCreateCart() {
  if (!isSupabaseConfigured()) throw new Error("Supabase nu este configurat.");
  const user = await getCurrentUser();
  if (user) {
    const { data: existing } = await sb().from("carts").select("*").eq("profile_id", user.id).maybeSingle();
    if (existing) return camelKeys<CartRow>(existing);
    const { data: created, error } = await sb().from("carts").insert({ profile_id: user.id }).select("*").single();
    if (error || !created) throw new Error(error?.message ?? "Nu am putut crea coșul.");
    return camelKeys<CartRow>(created);
  }
  const token = await createGuestToken();
  const existing = await loadGuestCart(token);
  if (existing) return existing;
  const { data: created, error } = await sb().from("carts").insert({ guest_token_hash: sha256(token) }).select("*").single();
  if (error || !created) throw new Error(error?.message ?? "Nu am putut crea coșul.");
  return camelKeys<CartRow>(created);
}

export async function mergeGuestCartOnLogin(profileId: string) {
  if (!isSupabaseConfigured()) return;
  const token = await readGuestToken();
  if (!token) return;
  const guestCart = await loadGuestCart(token);
  if (!guestCart) return;
  const { data: target } = await sb().from("carts").select("*").eq("profile_id", profileId).maybeSingle();
  let dest = target ? camelKeys<CartRow>(target) : null;
  if (!dest) {
    const { data: created } = await sb().from("carts").insert({ profile_id: profileId }).select("*").single();
    dest = created ? camelKeys<CartRow>(created) : null;
  }
  if (!dest) return;
  const { data: items } = await sb().from("cart_items").select("*").eq("cart_id", guestCart.id);
  for (const raw of items ?? []) {
    const item = camelKeys<CartItemRow>(raw);
    const { data: existing } = await sb()
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", dest.id)
      .eq("variant_id", item.variantId)
      .maybeSingle();
    if (existing) {
      await sb()
        .from("cart_items")
        .update({ quantity: Number(existing.quantity) + item.quantity })
        .eq("id", existing.id);
    } else {
      await sb().from("cart_items").insert({ cart_id: dest.id, variant_id: item.variantId, quantity: item.quantity });
    }
  }
  await sb().from("carts").delete().eq("id", guestCart.id);
}

export async function addToCart(variantId: string, quantity: number) {
  const parsed = cartItemSchema.parse({ variantId, quantity });
  const cart = await getOrCreateCart();
  const { data: existing } = await sb()
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.id)
    .eq("variant_id", parsed.variantId)
    .maybeSingle();
  if (existing) {
    await sb()
      .from("cart_items")
      .update({ quantity: Number(existing.quantity) + parsed.quantity })
      .eq("id", existing.id);
  } else {
    await sb()
      .from("cart_items")
      .insert({ cart_id: cart.id, variant_id: parsed.variantId, quantity: parsed.quantity });
  }
  return getCartView();
}

export async function updateCartItem(variantId: string, quantity: number) {
  const cart = await getOrCreateCart();
  if (quantity <= 0) {
    await sb().from("cart_items").delete().eq("cart_id", cart.id).eq("variant_id", variantId);
  } else {
    await sb().from("cart_items").update({ quantity }).eq("cart_id", cart.id).eq("variant_id", variantId);
  }
  return getCartView();
}

/** Read-only. Server Components may call this. Empty cart if no guest token yet. */
export async function getCartView(shippingMethodId?: string, discountCode?: string) {
  if (!isSupabaseConfigured()) return EMPTY_CART;
  const cart = await getExistingCart();
  if (!cart) return EMPTY_CART;
  const { data: rawItems } = await sb().from("cart_items").select("*").eq("cart_id", cart.id);
  const items = camelListSafe(rawItems);
  if (items.length === 0) {
    return { cartId: cart.id, items: [], quote: null as Awaited<ReturnType<typeof quoteCart>> | null };
  }
  const user = await getCurrentUser();
  try {
    const quote = await quoteCart({
      items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      shippingMethodId,
      discountCode,
      profileId: user?.id,
    });
    return { cartId: cart.id, items, quote };
  } catch {
    return { cartId: cart.id, items, quote: null, error: "Coșul trebuie actualizat." };
  }
}

export async function clearCart(cartId: string) {
  if (!isSupabaseConfigured() || !cartId) return;
  await sb().from("cart_items").delete().eq("cart_id", cartId);
}

function camelListSafe(rows: unknown[] | null | undefined): CartItemRow[] {
  return (rows ?? []).map((row) => camelKeys<CartItemRow>(row));
}
