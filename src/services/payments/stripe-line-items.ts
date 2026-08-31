import { assertMinorUnits } from "@/lib/money";

export type QuoteForStripe = {
  currency: string;
  lines: {
    productName: string;
    variantName: string;
    quantity: number;
    lineTotal: number;
  }[];
  discountTotal: number;
  shippingTotal: number;
  shippingMethodName?: string | null;
  taxTotal: number;
  pricesIncludeTax: boolean;
  grandTotal: number;
};

export type StripePriceDataLine = {
  quantity: number;
  price_data: {
    currency: string;
    unit_amount: number;
    product_data: {
      name: string;
      description?: string;
    };
  };
};

function allocate(amounts: number[], totalToRemove: number): number[] {
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalToRemove <= 0) return amounts.map(() => 0);
  const shares = amounts.map((amount, index) =>
    index === amounts.length - 1 ? 0 : Math.round((amount / sum) * totalToRemove),
  );
  const used = shares.reduce((a, b) => a + b, 0);
  shares[shares.length - 1] = totalToRemove - used;
  return shares;
}

function pushLine(
  items: StripePriceDataLine[],
  currency: string,
  name: string,
  description: string | undefined,
  quantity: number,
  lineAmount: number,
) {
  if (lineAmount <= 0 || quantity <= 0) return;
  const qty = Math.max(1, quantity);
  const even = lineAmount % qty === 0;
  items.push({
    quantity: even ? qty : 1,
    price_data: {
      currency,
      unit_amount: even ? lineAmount / qty : lineAmount,
      product_data: description
        ? { name: even ? name : `${name} × ${qty}`, description }
        : { name: even ? name : `${name} × ${qty}` },
    },
  });
}

/** Builds Stripe Checkout line_items from a Ravilo quote. Sum(unit_amount * qty) === grandTotal. */
export function stripeLineItemsFromQuote(quote: QuoteForStripe): StripePriceDataLine[] {
  const currency = quote.currency.toLowerCase();
  const discounts = allocate(
    quote.lines.map((line) => line.lineTotal),
    assertMinorUnits(quote.discountTotal),
  );
  const items: StripePriceDataLine[] = [];
  quote.lines.forEach((line, index) => {
    const discounted = Math.max(0, line.lineTotal - (discounts[index] ?? 0));
    const name = line.productName.slice(0, 100);
    const description = line.variantName ? line.variantName.slice(0, 500) : undefined;
    pushLine(items, currency, name, description, line.quantity, discounted);
  });
  if (!quote.pricesIncludeTax && quote.taxTotal > 0) {
    pushLine(items, currency, "TVA", undefined, 1, quote.taxTotal);
  }
  if (quote.shippingTotal > 0) {
    pushLine(items, currency, quote.shippingMethodName?.trim() || "Transport", undefined, 1, quote.shippingTotal);
  }
  const summed = stripeLinesTotal(items);
  const target = assertMinorUnits(quote.grandTotal);
  if (summed !== target && items.length) {
    const last = items[items.length - 1];
    if (last.quantity === 1) {
      last.price_data.unit_amount = Math.max(0, last.price_data.unit_amount + (target - summed));
    } else {
      pushLine(items, currency, "Ajustare", undefined, 1, Math.max(0, target - summed));
    }
  }
  return items.filter((item) => item.price_data.unit_amount > 0);
}

export function stripeLinesTotal(items: StripePriceDataLine[]): number {
  return items.reduce((sum, item) => sum + item.price_data.unit_amount * item.quantity, 0);
}
