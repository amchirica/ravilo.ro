import { afterEach, describe, expect, it } from "vitest";
import { postAuthPath } from "../src/lib/redirect";
import { authScopeFromRequest, cookiesForScope, hasAdminAuthCookie, hasShopAuthCookie } from "../src/lib/supabase/auth-scope";
import { sanitizeCmsHtml } from "../src/lib/sanitize";
import {
  getServerWishlistSnapshot,
  getWishlistEntriesSnapshot,
  resetWishlistStoreForTests,
  toggleWishlistEntry,
} from "../src/lib/wishlist-store";

describe("postAuthPath", () => {
  it("rejects login loops including locale-prefixed paths", () => {
    expect(postAuthPath("/auth/login", "/")).toBe("/");
    expect(postAuthPath("/auth/login?next=/cont", "/")).toBe("/");
    expect(postAuthPath("/en/auth/login", "/en")).toBe("/en");
    expect(postAuthPath("/admin/login", "/admin")).toBe("/admin");
    expect(postAuthPath("/cont", "/")).toBe("/cont");
    expect(postAuthPath("/en/cont", "/en")).toBe("/en/cont");
  });
});

describe("auth cookie scopes", () => {
  it("keeps shop and admin supabase cookies isolated", () => {
    const all = [
      { name: "sb-demo-auth-token", value: "shop" },
      { name: "sb-demo-auth-token.0", value: "shop-chunk" },
      { name: "ravilo-admin-auth", value: "admin" },
      { name: "ravilo-admin-auth.0", value: "admin-chunk" },
    ];
    expect(cookiesForScope(all, "shop").map((cookie) => cookie.name)).toEqual([
      "sb-demo-auth-token",
      "sb-demo-auth-token.0",
    ]);
    expect(cookiesForScope(all, "admin").map((cookie) => cookie.name)).toEqual([
      "ravilo-admin-auth",
      "ravilo-admin-auth.0",
    ]);
    expect(hasShopAuthCookie(all)).toBe(true);
    expect(hasAdminAuthCookie(all)).toBe(true);
    expect(hasShopAuthCookie([{ name: "ravilo-admin-auth" }])).toBe(false);
    expect(hasAdminAuthCookie([{ name: "sb-demo-auth-token" }])).toBe(false);
  });

  it("treats admin routes as a separate auth scope", () => {
    expect(authScopeFromRequest("/admin", "http://localhost:3000/cont")).toBe("admin");
    expect(authScopeFromRequest("/cont", "http://localhost:3000/admin")).toBe("shop");
    expect(authScopeFromRequest("", "http://localhost:3000/admin/produse")).toBe("admin");
    expect(authScopeFromRequest("/auth/login", "http://localhost:3000/cont")).toBe("shop");
  });
});

describe("sanitizeCmsHtml", () => {
  it("strips script tags from CMS HTML", () => {
    const html = `<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>`;
    const clean = sanitizeCmsHtml(html);
    expect(clean).not.toMatch(/<script/i);
    expect(clean).not.toMatch(/javascript:/i);
    expect(clean).toMatch(/Hello/);
  });
});

describe("wishlist store snapshot identity", () => {
  afterEach(() => {
    resetWishlistStoreForTests();
  });

  it("returns the same snapshot reference when storage is unchanged", () => {
    const memory = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    } as Storage;

    const first = getWishlistEntriesSnapshot();
    const second = getWishlistEntriesSnapshot();
    expect(first).toBe(second);
    expect(first).toBe(getServerWishlistSnapshot());

    toggleWishlistEntry("p1", "slug-1", "Produs");
    const afterAdd = getWishlistEntriesSnapshot();
    expect(afterAdd).not.toBe(first);
    expect(afterAdd).toEqual([{ id: "p1", slug: "slug-1", name: "Produs" }]);
    expect(getWishlistEntriesSnapshot()).toBe(afterAdd);

    toggleWishlistEntry("p1");
    expect(getWishlistEntriesSnapshot()).toBe(getServerWishlistSnapshot());
  });
});
