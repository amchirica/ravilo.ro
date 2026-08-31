import { describe, expect, it } from "vitest";
import { toMinorUnits, fromMinorUnits, addMoney, applyBps, multiplyMoney, percentOf } from "../src/lib/money";
import { stripeLineItemsFromQuote, stripeLinesTotal } from "../src/services/payments/stripe-line-items";
import { checkoutSchema } from "../src/schemas/commerce";
import { safeInternalPath } from "../src/lib/redirect";
import { canTransitionOrder } from "../src/types/domain";
import { checkoutHoldSeconds, stripeLocale, STRIPE_MIN_HOLD_SECONDS } from "../src/lib/checkout-hold";

describe("money", () => {
  it("keeps integer bani", () => {
    expect(addMoney(19999, 1900)).toBe(21899);
    expect(multiplyMoney(7900, 3)).toBe(23700);
    expect(percentOf(10000, 10)).toBe(1000);
    expect(applyBps(10000, 2100)).toBe(2100);
  });

  it("converts major units through toMinorUnits", () => {
    expect(toMinorUnits("129.90")).toBe(12990);
    expect(toMinorUnits(129.9)).toBe(12990);
    expect(fromMinorUnits(12990)).toBe(129.9);
  });
});

describe("stripe line items from Ravilo quote", () => {
  it("matches grand total for A x2 + B x1 + shipping", () => {
    const items = stripeLineItemsFromQuote({
      currency: "RON",
      lines: [
        { productName: "A", variantName: "default", quantity: 2, lineTotal: 19980 },
        { productName: "B", variantName: "default", quantity: 1, lineTotal: 14900 },
      ],
      discountTotal: 0,
      shippingTotal: 1900,
      shippingMethodName: "Curier",
      taxTotal: 0,
      pricesIncludeTax: true,
      grandTotal: 36780,
    });
    expect(stripeLinesTotal(items)).toBe(36780);
    expect(items.some((item) => item.quantity === 2 && item.price_data.unit_amount === 9990)).toBe(true);
    expect(items.some((item) => item.price_data.product_data.name === "B")).toBe(true);
    expect(items.every((item) => !("price" in item) && item.price_data.unit_amount > 0)).toBe(true);
  });

  it("applies Ravilo discount without Stripe coupon IDs", () => {
    const items = stripeLineItemsFromQuote({
      currency: "RON",
      lines: [{ productName: "A", variantName: "", quantity: 1, lineTotal: 10000 }],
      discountTotal: 1000,
      shippingTotal: 0,
      taxTotal: 0,
      pricesIncludeTax: true,
      grandTotal: 9000,
    });
    expect(stripeLinesTotal(items)).toBe(9000);
  });
});

describe("money rejects floats", () => {
  it("rejects floats as money amounts", () => {
    expect(() => addMoney(1.5 as unknown as number)).toThrow();
  });
});

describe("open redirect", () => {
  it("allows only internal paths", () => {
    expect(safeInternalPath("/cont")).toBe("/cont");
    expect(safeInternalPath("https://evil.test")).toBe("/");
    expect(safeInternalPath("//evil.test")).toBe("/");
    expect(safeInternalPath("\\evil")).toBe("/");
  });
});

describe("order transitions", () => {
  it("allows paid to processing and rejects delivered back to pending", () => {
    expect(canTransitionOrder("PENDING_PAYMENT", "PAID")).toBe(true);
    expect(canTransitionOrder("PAID", "PROCESSING")).toBe(true);
    expect(canTransitionOrder("DELIVERED", "PENDING_PAYMENT")).toBe(false);
    expect(canTransitionOrder("REFUNDED", "PAID")).toBe(false);
  });
});

describe("checkout hold", () => {
  it("raises short reservations to the Stripe 30-minute minimum", () => {
    expect(checkoutHoldSeconds(15)).toBe(STRIPE_MIN_HOLD_SECONDS);
    expect(checkoutHoldSeconds(45)).toBe(45 * 60);
    expect(stripeLocale("ro")).toBe("ro");
    expect(stripeLocale("en")).toBe("en");
  });
});

describe("checkout payload", () => {
  it("strips client-sent totals so they cannot become source of truth", () => {
    const parsed = checkoutSchema.parse({
      email: "client@ravilo.ro",
      phone: "0712345678",
      shippingMethodId: "ship-1",
      grandTotal: 1,
      price: 1,
      subtotal: 1,
      shipping: {
        firstName: "Ana",
        lastName: "Pop",
        county: "B",
        city: "București",
        street: "Strada",
        number: "1",
        postalCode: "010101",
        phone: "0712345678",
        country: "RO",
      },
    });
    expect(parsed).not.toHaveProperty("grandTotal");
    expect(parsed).not.toHaveProperty("price");
    expect(parsed).not.toHaveProperty("subtotal");
  });
});
