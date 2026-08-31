import { describe, expect, it } from "vitest";
import { normalizeBannerPlacement } from "../src/lib/banner-placement";

describe("normalizeBannerPlacement", () => {
  it("maps aliases to canonical slots", () => {
    expect(normalizeBannerPlacement("homepage")).toBe("homepage");
    expect(normalizeBannerPlacement(" Home ")).toBe("homepage");
    expect(normalizeBannerPlacement("categorii")).toBe("category");
    expect(normalizeBannerPlacement("coș")).toBe("cart");
    expect(normalizeBannerPlacement("all")).toBe("global");
  });

  it("falls back to homepage for unknown values", () => {
    expect(normalizeBannerPlacement("")).toBe("homepage");
    expect(normalizeBannerPlacement("hero")).toBe("homepage");
  });
});
