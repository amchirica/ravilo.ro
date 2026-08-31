import "server-only";

export const STOREFRONT_REVALIDATE_SEC = 120;

export const STOREFRONT_CACHE = {
  settings: "store-settings",
  announcement: "store-announcement",
  categories: "store-categories",
  homepage: "store-homepage",
  banners: "store-banners",
} as const;

type StorefrontTag = (typeof STOREFRONT_CACHE)[keyof typeof STOREFRONT_CACHE];

const mem = new Map<string, { exp: number; value: unknown }>();

/** Per-isolate TTL. OpenNext on Workers Free has no R2 incremental cache. */
export async function isolateMemo<T>(key: string, load: () => Promise<T>, ttlSec = STOREFRONT_REVALIDATE_SEC): Promise<T> {
  const now = Date.now();
  const hit = mem.get(key);
  if (hit && hit.exp > now) return hit.value as T;
  const value = await load();
  mem.set(key, { exp: now + ttlSec * 1000, value });
  return value;
}

export function revalidateStorefrontTag(tag: StorefrontTag) {
  for (const key of [...mem.keys()]) {
    if (key === tag || key.startsWith(`${tag}:`)) mem.delete(key);
  }
}
