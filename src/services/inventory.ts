import "server-only";
import { sb } from "@/lib/supabase/db";
import { camelList } from "@/lib/supabase/rows";

export class InventoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InventoryError";
  }
}

type Reservation = {
  id: string;
  variantId: string;
  locationId: string;
  quantity: number;
};

export async function reserveStock(input: {
  variantId: string;
  locationId: string;
  quantity: number;
  orderId: string;
  actorUserId?: string;
  expiresAt: Date;
  allowBackorder: boolean;
}) {
  if (input.allowBackorder) {
    const { data: existing } = await sb()
      .from("inventory_levels")
      .select("id, reserved_quantity")
      .eq("variant_id", input.variantId)
      .eq("location_id", input.locationId)
      .maybeSingle();
    if (existing) {
      const { error } = await sb()
        .from("inventory_levels")
        .update({ reserved_quantity: Number(existing.reserved_quantity) + input.quantity })
        .eq("id", existing.id);
      if (error) throw new InventoryError("Stoc insuficient");
    } else {
      const { error } = await sb().from("inventory_levels").insert({
        variant_id: input.variantId,
        location_id: input.locationId,
        quantity: 0,
        reserved_quantity: input.quantity,
      });
      if (error) throw new InventoryError("Stoc insuficient");
    }
  } else {
    const { error } = await sb().rpc("reserve_inventory", {
      p_variant_id: input.variantId,
      p_location_id: input.locationId,
      p_qty: input.quantity,
    });
    if (error) throw new InventoryError("Stoc insuficient");
  }
  await sb().from("inventory_transactions").insert({
    variant_id: input.variantId,
    location_id: input.locationId,
    type: "RESERVATION",
    quantity: input.quantity,
    order_id: input.orderId,
    actor_user_id: input.actorUserId ?? null,
    reason: "checkout",
    expires_at: input.expiresAt.toISOString(),
  });
}

export async function convertReservationToSale(orderId: string) {
  const { data: alreadySold } = await sb()
    .from("inventory_transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "SALE")
    .maybeSingle();
  if (alreadySold) return;

  const { data: reservationsRaw } = await sb()
    .from("inventory_transactions")
    .select("*")
    .eq("order_id", orderId)
    .eq("type", "RESERVATION")
    .is("released_at", null);
  const reservations = camelList<Reservation>(reservationsRaw);

  if (reservations.length) {
    for (const reservation of reservations) {
      const { error } = await sb().rpc("confirm_inventory_sale", {
        p_variant_id: reservation.variantId,
        p_location_id: reservation.locationId,
        p_qty: reservation.quantity,
      });
      if (error) {
        await decrementSoldQuantity(reservation.variantId, reservation.locationId, reservation.quantity);
      }
      await recordSale(orderId, reservation.variantId, reservation.locationId, reservation.quantity);
      await sb().from("inventory_transactions").update({ released_at: new Date().toISOString() }).eq("id", reservation.id);
    }
    return;
  }

  const locationId = await defaultLocationId();
  const { data: items } = await sb().from("order_items").select("variant_id, quantity").eq("order_id", orderId);
  for (const item of items ?? []) {
    await decrementSoldQuantity(item.variant_id as string, locationId, Number(item.quantity));
    await recordSale(orderId, item.variant_id as string, locationId, Number(item.quantity));
  }
}

async function recordSale(orderId: string, variantId: string, locationId: string, quantity: number) {
  await sb().from("inventory_transactions").insert({
    variant_id: variantId,
    location_id: locationId,
    type: "SALE",
    quantity,
    order_id: orderId,
    reason: "payment_confirmed",
  });
}

async function decrementSoldQuantity(variantId: string, locationId: string, quantity: number) {
  const { data: level } = await sb()
    .from("inventory_levels")
    .select("id, quantity")
    .eq("variant_id", variantId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (!level) return;
  await sb()
    .from("inventory_levels")
    .update({ quantity: Math.max(0, Number(level.quantity) - quantity) })
    .eq("id", level.id);
}

export async function releaseReservationsForOrder(orderId: string) {
  const { data: reservationsRaw } = await sb()
    .from("inventory_transactions")
    .select("*")
    .eq("order_id", orderId)
    .eq("type", "RESERVATION")
    .is("released_at", null);
  const reservations = camelList<Reservation>(reservationsRaw);
  for (const reservation of reservations) {
    await sb().rpc("release_inventory", {
      p_variant_id: reservation.variantId,
      p_location_id: reservation.locationId,
      p_qty: reservation.quantity,
    });
    await sb().from("inventory_transactions").update({ released_at: new Date().toISOString() }).eq("id", reservation.id);
    await sb().from("inventory_transactions").insert({
      variant_id: reservation.variantId,
      location_id: reservation.locationId,
      type: "RELEASE",
      quantity: reservation.quantity,
      order_id: orderId,
      reason: "reservation_released",
    });
  }
}

export async function releaseExpiredReservations() {
  const { data: expiredRaw } = await sb()
    .from("inventory_transactions")
    .select("order_id")
    .eq("type", "RESERVATION")
    .is("released_at", null)
    .lte("expires_at", new Date().toISOString());
  const orderIds = [...new Set((expiredRaw ?? []).map((row) => row.order_id).filter(Boolean))] as string[];
  for (const orderId of orderIds) {
    const { data: order } = await sb().from("orders").select("id, payment_status, status").eq("id", orderId).maybeSingle();
    if (!order || order.payment_status === "PAID") continue;
    await releaseReservationsForOrder(orderId);
    if (order.status === "PENDING_PAYMENT") {
      await sb()
        .from("orders")
        .update({
          status: "CANCELLED",
          cancelled_at: new Date().toISOString(),
          payment_status: "FAILED",
        })
        .eq("id", orderId);
    }
  }
  return orderIds.length;
}

export async function defaultLocationId() {
  const { data: preferred } = await sb().from("inventory_locations").select("id").eq("is_default", true).maybeSingle();
  if (preferred?.id) return preferred.id as string;
  const { data: anyLocation } = await sb().from("inventory_locations").select("id").limit(1).maybeSingle();
  if (anyLocation?.id) return anyLocation.id as string;

  const { data: created, error } = await sb()
    .from("inventory_locations")
    .upsert(
      { name: "Depozit principal", code: "MAIN", is_default: true, is_active: true },
      { onConflict: "code" },
    )
    .select("id")
    .single();
  if (created?.id) return created.id as string;

  const { data: fallback } = await sb().from("inventory_locations").select("id").eq("code", "MAIN").maybeSingle();
  if (fallback?.id) return fallback.id as string;
  throw new InventoryError(error?.message ?? "Nu am putut crea depozitul principal.");
}

export async function setVariantStock(variantId: string, quantity: number) {
  const qty = Math.max(0, Math.floor(quantity));
  const locationId = await defaultLocationId();
  const { data: existing } = await sb()
    .from("inventory_levels")
    .select("id")
    .eq("variant_id", variantId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (existing) {
    const { error } = await sb().from("inventory_levels").update({ quantity: qty }).eq("id", existing.id);
    if (error) throw new InventoryError(error.message);
  } else {
    const { error } = await sb().from("inventory_levels").insert({
      variant_id: variantId,
      location_id: locationId,
      quantity: qty,
      reserved_quantity: 0,
    });
    if (error) throw new InventoryError(error.message);
  }
}
