import "server-only";

import { sb } from "@/lib/supabase/db";
import type { OrderStatus } from "@/types/domain";

export async function recordOrderStatusChange(input: {
  orderId: string;
  fromStatus?: string | null;
  toStatus: string;
  actorId?: string | null;
  note?: string;
}) {
  const { error } = await sb().from("order_status_history").insert({
    order_id: input.orderId,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus,
    actor_id: input.actorId ?? null,
    note: input.note ?? "",
  });
  return error;
}

export function fulfillmentStatusFor(status: OrderStatus, current: string) {
  if (status === "SHIPPED" || status === "DELIVERED") return "FULFILLED";
  return current;
}
