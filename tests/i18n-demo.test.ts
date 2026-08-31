import { describe, expect, it } from "vitest";
import { pickLocalized, translationMissing, localeAlternates, intlLocale } from "../src/lib/i18n";
import { assertCanSeedDemo, canSeedDemo } from "../src/lib/dev-seed-guard";
import { formatRon } from "../src/lib/money";
import { publicStockStatus } from "../src/lib/stock";
import { slugify } from "../src/lib/slug";
import { isAdminRole } from "../src/server/rbac";
import type { AppLocale } from "../src/lib/i18n";

describe("i18n fallback", () => {
  it("falls back to RO when EN is missing", () => {
    expect(pickLocalized("Suport auto", "", "en")).toBe("Suport auto");
    expect(pickLocalized("Suport auto", "Car mount", "en")).toBe("Car mount");
    expect(pickLocalized("Suport auto", "Car mount", "ro")).toBe("Suport auto");
    expect(pickLocalized(undefined, undefined, "en")).toBe("");
  });

  it("marks missing English", () => {
    expect(translationMissing(null)).toBe(true);
    expect(translationMissing("  ")).toBe(true);
    expect(translationMissing("Car mount")).toBe(false);
  });

  it("builds hreflang alternates", () => {
    const alt = localeAlternates("/categorie/auto", "en", "https://ravilo.ro");
    expect(alt.canonical).toBe("https://ravilo.ro/en/categorie/auto");
    expect(alt.languages["ro-RO"]).toBe("https://ravilo.ro/categorie/auto");
    expect(alt.languages.en).toBe("https://ravilo.ro/en/categorie/auto");
    expect(alt.languages["x-default"]).toBe("https://ravilo.ro/categorie/auto");
  });

  it("formats money by locale", () => {
    expect(formatRon(12900, intlLocale("ro" as AppLocale))).toMatch(/129/);
    expect(formatRon(12900, intlLocale("en"))).toMatch(/129/);
  });
});

describe("demo seed safety", () => {
  it("rejects production without flag", () => {
    expect(() => assertCanSeedDemo({ NODE_ENV: "production", ALLOW_DEV_SEED: "false" } as unknown as NodeJS.ProcessEnv)).toThrow(/production/);
  });

  it("rejects when flag is off", () => {
    expect(() => assertCanSeedDemo({ NODE_ENV: "development", ALLOW_DEV_SEED: "false" } as unknown as NodeJS.ProcessEnv)).toThrow(/ALLOW_DEV_SEED/);
    expect(canSeedDemo({ NODE_ENV: "development", ALLOW_DEV_SEED: "true" } as unknown as NodeJS.ProcessEnv)).toBe(true);
    expect(canSeedDemo({ NODE_ENV: "development", ALLOW_DEV_SEED: "false" } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("public stock status", () => {
  it("never needs reserved quantity", () => {
    expect(publicStockStatus(0, 5)).toBe("OUT");
    expect(publicStockStatus(3, 5)).toBe("LOW");
    expect(publicStockStatus(12, 5)).toBe("IN_STOCK");
  });
});

describe("slugify and admin role", () => {
  it("slugifies romanian names", () => {
    expect(slugify("Suport Auto USB-C")).toBe("suport-auto-usb-c");
  });
  it("treats only ADMIN and SUPER_ADMIN as admin", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("MANAGER")).toBe(false);
    expect(isAdminRole("CUSTOMER")).toBe(false);
  });
});
