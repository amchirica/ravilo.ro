import { describe, expect, it } from "vitest";
import { bundlePackCount, computeBundleSavings } from "../src/lib/bundle-savings";

describe("bundlePackCount", () => {
  it("returns complete packs only", () => {
    const remaining = new Map([
      ["a", 4],
      ["b", 2],
    ]);
    expect(bundlePackCount(remaining, [
      { variantId: "a", quantity: 1 },
      { variantId: "b", quantity: 1 },
    ])).toBe(2);
    expect(bundlePackCount(remaining, [
      { variantId: "a", quantity: 2 },
      { variantId: "b", quantity: 1 },
    ])).toBe(2);
  });

  it("returns 0 when a kit item is missing", () => {
    expect(
      bundlePackCount(new Map([["a", 3]]), [
        { variantId: "a", quantity: 1 },
        { variantId: "b", quantity: 1 },
      ]),
    ).toBe(0);
  });
});

describe("computeBundleSavings", () => {
  it("applies kit price against live unit totals", () => {
    const savings = computeBundleSavings(
      [
        { variantId: "a", quantity: 1, unitPrice: 10000 },
        { variantId: "b", quantity: 1, unitPrice: 5000 },
      ],
      [{ id: "kit", price: 12000, items: [{ variantId: "a", quantity: 1 }, { variantId: "b", quantity: 1 }] }],
    );
    expect(savings).toBe(3000);
  });

  it("does not overlap two kits that share a product", () => {
    const savings = computeBundleSavings(
      [
        { variantId: "a", quantity: 1, unitPrice: 10000 },
        { variantId: "b", quantity: 1, unitPrice: 5000 },
        { variantId: "c", quantity: 1, unitPrice: 4000 },
      ],
      [
        { id: "ab", price: 12000, items: [{ variantId: "a", quantity: 1 }, { variantId: "b", quantity: 1 }] },
        { id: "ac", price: 11000, items: [{ variantId: "a", quantity: 1 }, { variantId: "c", quantity: 1 }] },
      ],
    );
    expect(savings).toBe(3000);
  });
});
