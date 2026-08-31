export type BundleCartLine = {
  variantId: string;
  quantity: number;
  unitPrice: number;
};

export type BundleOffer = {
  id: string;
  price: number;
  items: { variantId: string; quantity: number }[];
};

/** How many complete packs fit in the remaining quantities. */
export function bundlePackCount(
  remaining: Map<string, number>,
  items: { variantId: string; quantity: number }[],
): number {
  if (items.length < 2) return 0;
  let packs = Number.POSITIVE_INFINITY;
  for (const item of items) {
    if (item.quantity < 1) return 0;
    packs = Math.min(packs, Math.floor((remaining.get(item.variantId) ?? 0) / item.quantity));
  }
  return Number.isFinite(packs) && packs > 0 ? packs : 0;
}

/**
 * Greedy savings when the cart contains every item of a published kit.
 * Uses live unit prices vs the kit price, so the discount stays honest if catalog prices change.
 */
export function computeBundleSavings(cartItems: BundleCartLine[], bundles: BundleOffer[]): number {
  const remaining = new Map<string, number>();
  const unitPrice = new Map<string, number>();
  for (const item of cartItems) {
    remaining.set(item.variantId, (remaining.get(item.variantId) ?? 0) + item.quantity);
    unitPrice.set(item.variantId, item.unitPrice);
  }

  const scored = bundles
    .map((bundle) => {
      const catalogSum = bundle.items.reduce(
        (sum, item) => sum + (unitPrice.get(item.variantId) ?? 0) * item.quantity,
        0,
      );
      return { bundle, perPack: Math.max(0, catalogSum - bundle.price) };
    })
    .filter((row) => row.perPack > 0)
    .sort((a, b) => b.perPack - a.perPack);

  let savings = 0;
  for (const { bundle, perPack } of scored) {
    const packs = bundlePackCount(remaining, bundle.items);
    if (packs < 1) continue;
    savings += packs * perPack;
    for (const item of bundle.items) {
      remaining.set(item.variantId, (remaining.get(item.variantId) ?? 0) - packs * item.quantity);
    }
  }
  return savings;
}
