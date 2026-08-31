import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";

export async function writeAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
  userAgent?: string | null;
}) {
  if (!isSupabaseConfigured()) return;
  await sb().from("audit_logs").insert({
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ip_hash: input.ipHash ?? null,
    user_agent: input.userAgent?.slice(0, 255) ?? null,
  });
}
