export type WishlistEntry = { id: string; slug?: string; name?: string };

const KEY = "ravilo_wishlist_ids";
const META_KEY = "ravilo_wishlist_meta";
const listeners = new Set<() => void>();

const EMPTY_IDS: string[] = [];
const EMPTY_ENTRIES: WishlistEntry[] = [];

let cachedIdsRaw: string | null = null;
let cachedMetaRaw: string | null = null;
let cachedIds: string[] = EMPTY_IDS;
let cachedEntries: WishlistEntry[] = EMPTY_ENTRIES;

function readRaw(key: string, fallback: string) {
  try {
    if (typeof localStorage === "undefined") return fallback;
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function refreshCache() {
  const idsRaw = readRaw(KEY, "[]");
  const metaRaw = readRaw(META_KEY, "{}");
  if (idsRaw === cachedIdsRaw && metaRaw === cachedMetaRaw) return;
  cachedIdsRaw = idsRaw;
  cachedMetaRaw = metaRaw;
  let ids: string[] = EMPTY_IDS;
  let meta: Record<string, { slug?: string; name?: string }> = {};
  try {
    const parsed = JSON.parse(idsRaw) as unknown;
    ids = Array.isArray(parsed) ? (parsed as string[]) : EMPTY_IDS;
  } catch {
    ids = EMPTY_IDS;
  }
  try {
    meta = JSON.parse(metaRaw) as Record<string, { slug?: string; name?: string }>;
  } catch {
    meta = {};
  }
  if (ids.length === 0) {
    cachedIds = EMPTY_IDS;
    cachedEntries = EMPTY_ENTRIES;
    return;
  }
  cachedIds = ids;
  cachedEntries = ids.map((id) => ({ id, ...meta[id] }));
}

function notify() {
  cachedIdsRaw = null;
  cachedMetaRaw = null;
  refreshCache();
  listeners.forEach((listener) => listener());
}

export function getWishlistIdsSnapshot(): string[] {
  refreshCache();
  return cachedIds;
}

export function getWishlistEntriesSnapshot(): WishlistEntry[] {
  refreshCache();
  return cachedEntries;
}

export function readWishlistEntries(): WishlistEntry[] {
  return getWishlistEntriesSnapshot();
}

export function getServerWishlistSnapshot(): WishlistEntry[] {
  return EMPTY_ENTRIES;
}

export function subscribeWishlist(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange);
    };
  }
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function writeWishlist(ids: string[], meta: Record<string, { slug?: string; name?: string }>) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  localStorage.setItem(META_KEY, JSON.stringify(meta));
  notify();
}

export function toggleWishlistEntry(productId: string, slug?: string, name?: string) {
  const ids = new Set(getWishlistIdsSnapshot());
  const meta: Record<string, { slug?: string; name?: string }> = {};
  for (const entry of getWishlistEntriesSnapshot()) {
    meta[entry.id] = { slug: entry.slug, name: entry.name };
  }
  if (ids.has(productId)) {
    ids.delete(productId);
    delete meta[productId];
  } else {
    ids.add(productId);
    meta[productId] = { slug, name };
  }
  writeWishlist([...ids], meta);
}

export function resetWishlistStoreForTests() {
  cachedIdsRaw = null;
  cachedMetaRaw = null;
  cachedIds = EMPTY_IDS;
  cachedEntries = EMPTY_ENTRIES;
  listeners.clear();
}
