import "server-only";
import { isSupabaseConfigured, sb } from "@/lib/supabase/db";
import { camelKeys, camelList } from "@/lib/supabase/rows";
import { applyBps, minMoney, multiplyMoney, percentOf } from "@/lib/money";
import { getStoreSettings } from "@/services/settings";
import { resolveActiveShippingMethod } from "@/services/shipping";

export type QuoteLine = {
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  tax: number;
  allowBackorder: boolean;
  available: number;
};

export type Quote = {
  currency: string;
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  discountCode: string | null;
  shippingTotal: number;
  shippingMethod: { id: string; name: string; price: number; freeAbove: number | null } | null;
  taxTotal: number;
  taxRateBps: number;
  pricesIncludeTax: boolean;
  grandTotal: number;
};

type VariantRow = {
  id: string;
  sku: string;
  name: string;
  productId: string;
  isActive: boolean;
  priceOverride: number | null;
  product: {
    id: string;
    name: string;
    salePrice: number;
    isActive: boolean;
    status: string;
    allowBackorder: boolean;
  };
  inventory: { quantity: number; reservedQuantity: number }[];
};

type DiscountRow = {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  value: number;
  minimumOrderValue: number;
  usageLimit: number | null;
  usagePerCustomer: number;
  maximumDiscount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  scopes: { scope: string }[];
  redemptions: { profileId: string | null }[];
};

export async function quoteCart(input: {
  items: { variantId: string; quantity: number }[];
  discountCode?: string;
  shippingMethodId?: string;
  profileId?: string;
}): Promise<Quote> {
  if (input.items.length === 0) {
    throw new Error("Coșul este gol.");
  }
  if (!isSupabaseConfigured()) throw new Error("Supabase nu este configurat.");
  const settings = await getStoreSettings();
  const { data: variantRows } = await sb()
    .from("product_variants")
    .select(
      "id, sku, name, product_id, is_active, price_override, product:products(id, name, sale_price, is_active, status, allow_backorder), inventory:inventory_levels(quantity, reserved_quantity)",
    )
    .in(
      "id",
      input.items.map((item) => item.variantId),
    );
  const variants = camelList<VariantRow>(variantRows);
  const byId = new Map(variants.map((row) => [row.id, row]));
  const lines: QuoteLine[] = [];
  for (const item of input.items) {
    const variant = byId.get(item.variantId);
    if (!variant) {
      throw new Error("Un produs din coș nu mai este disponibil.");
    }
    if (!variant.isActive || !variant.product.isActive || variant.product.status !== "ACTIVE") {
      throw new Error(`Produsul ${variant.product.name} nu mai este disponibil.`);
    }
    const available = (variant.inventory ?? []).reduce((sum, level) => sum + (level.quantity - level.reservedQuantity), 0);
    if (!variant.product.allowBackorder && available < item.quantity) {
      throw new Error(`Produsul ${variant.product.name} nu mai este disponibil în cantitatea selectată.`);
    }
    const unitPrice = variant.priceOverride ?? variant.product.salePrice;
    const lineTotal = multiplyMoney(unitPrice, item.quantity);
    lines.push({
      variantId: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      productName: variant.product.name,
      variantName: variant.name,
      quantity: item.quantity,
      unitPrice,
      lineTotal,
      tax: 0,
      allowBackorder: variant.product.allowBackorder,
      available,
    });
  }
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let discountTotal = 0;
  let discountCode: string | null = null;
  if (input.discountCode) {
    const { data: discountRaw } = await sb()
      .from("discounts")
      .select("*, scopes:discount_targets(scope), redemptions:discount_redemptions(profile_id)")
      .eq("code", input.discountCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (discountRaw) {
      const discount = camelKeys<DiscountRow>(discountRaw);
      const now = new Date();
      const inWindow = (!discount.startsAt || discount.startsAt <= now) && (!discount.endsAt || discount.endsAt >= now);
      const underGlobal = discount.usageLimit == null || discount.redemptions.length < discount.usageLimit;
      const customerUses = input.profileId
        ? discount.redemptions.filter((row) => row.profileId === input.profileId).length
        : 0;
      const underCustomer = customerUses < discount.usagePerCustomer;
      const eligible = discount.scopes.length === 0 || discount.scopes.some((scope) => scope.scope === "ALL");
      if (inWindow && underGlobal && underCustomer && eligible && subtotal >= discount.minimumOrderValue) {
        if (discount.type === "PERCENTAGE") {
          discountTotal = percentOf(subtotal, discount.value);
        } else if (discount.type === "FIXED_AMOUNT") {
          discountTotal = minMoney(discount.value, subtotal);
        }
        if (discount.maximumDiscount != null) {
          discountTotal = minMoney(discountTotal, discount.maximumDiscount);
        }
        discountCode = discount.code;
      }
    }
  }
  let shippingMethod: Quote["shippingMethod"] = null;
  let shippingTotal = 0;
  const method = await resolveActiveShippingMethod(input.shippingMethodId);
  if (input.shippingMethodId && !method) {
    throw new Error("Metoda de livrare nu este disponibilă. Alege o metodă activă sau adaugă una în Admin → Livrare.");
  }
  if (method) {
    const afterDiscount = subtotal - discountTotal;
    const threshold = settings.freeShippingThreshold;
    shippingTotal = threshold > 0 && afterDiscount >= threshold ? 0 : method.price;
    if (discountCode) {
      const { data: freeShip } = await sb()
        .from("discounts")
        .select("id")
        .eq("code", discountCode)
        .eq("type", "FREE_SHIPPING")
        .eq("is_active", true)
        .maybeSingle();
      if (freeShip) shippingTotal = 0;
    }
    shippingMethod = { id: method.id, name: method.name, price: method.price, freeAbove: method.freeAbove };
  }
  const taxable = subtotal - discountTotal;
  const taxRateBps = settings.vatEnabled ? settings.defaultTaxRateBps : 0;
  const taxTotal =
    !settings.vatEnabled || taxRateBps === 0
      ? 0
      : settings.pricesIncludeTax
        ? applyBps(taxable, Math.round((taxRateBps * 100) / (10000 + taxRateBps)))
        : applyBps(taxable, taxRateBps);
  for (const line of lines) {
    const share = taxable === 0 ? 0 : Math.round((line.lineTotal / subtotal) * taxTotal);
    line.tax = share;
  }
  const grandTotal = settings.pricesIncludeTax ? taxable + shippingTotal : taxable + taxTotal + shippingTotal;
  return {
    currency: settings.currency,
    lines,
    subtotal,
    discountTotal,
    discountCode,
    shippingTotal,
    shippingMethod,
    taxTotal,
    taxRateBps,
    pricesIncludeTax: settings.pricesIncludeTax,
    grandTotal,
  };
}
