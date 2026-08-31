import "server-only";
import { cache } from "react";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { STOREFRONT_CACHE, isolateMemo, revalidateStorefrontTag } from "@/lib/storefront-cache";
import { defaultStoreSettings, storeSettingsSchema, type StoreSettings } from "@/schemas/settings";

async function loadStoreSettings(): Promise<StoreSettings> {
  if (!isSupabaseConfigured()) return defaultStoreSettings();
  try {
    const { data, error } = await sb().from("store_settings").select("data").eq("id", "default").maybeSingle();
    if (error || !data) return defaultStoreSettings();
    return storeSettingsSchema.parse(data.data);
  } catch {
    return defaultStoreSettings();
  }
}

export const getStoreSettings = cache(() => isolateMemo(STOREFRONT_CACHE.settings, loadStoreSettings));

export async function saveStoreSettings(data: StoreSettings, actorUserId?: string) {
  const parsed = storeSettingsSchema.parse(data);
  const { error } = await sb()
    .from("store_settings")
    .upsert({
      id: "default",
      data: parsed,
      updated_by: actorUserId ?? null,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
  revalidateStorefrontTag(STOREFRONT_CACHE.settings);
  return parsed;
}

export async function isFeatureEnabled(key: string, fallback = true): Promise<boolean> {
  if (!isSupabaseConfigured()) return fallback;
  const { data } = await sb().from("feature_flags").select("enabled").eq("key", key).maybeSingle();
  return typeof data?.enabled === "boolean" ? data.enabled : fallback;
}
