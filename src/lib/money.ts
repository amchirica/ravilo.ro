export const ZERO_MONEY = 0;
export const DEFAULT_CURRENCY = "RON";

export function assertMinorUnits(amount: number): number {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("Money amounts must be non-negative integers (bani)");
  }
  return amount;
}

export function addMoney(...amounts: number[]): number {
  return amounts.reduce((sum, value) => sum + assertMinorUnits(value), 0);
}

export function subtractMoney(left: number, right: number): number {
  const result = assertMinorUnits(left) - assertMinorUnits(right);
  if (result < 0) {
    throw new Error("Money subtraction would be negative");
  }
  return result;
}

export function multiplyMoney(amount: number, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error("Quantity must be a non-negative integer");
  }
  return assertMinorUnits(amount) * quantity;
}

/** `bps` = basis points. 2100 = 21%. */
export function applyBps(amount: number, bps: number): number {
  if (!Number.isInteger(bps) || bps < 0) {
    throw new Error("Basis points must be a non-negative integer");
  }
  return Math.round((assertMinorUnits(amount) * bps) / 10_000);
}

export function percentOf(amount: number, percent: number): number {
  if (!Number.isInteger(percent) || percent < 0) {
    throw new Error("Percent must be a non-negative integer");
  }
  return Math.round((assertMinorUnits(amount) * percent) / 100);
}

export function minMoney(a: number, b: number): number {
  return Math.min(assertMinorUnits(a), assertMinorUnits(b));
}

export function formatRon(bani: number, locale = "ro-RO"): string {
  const value = assertMinorUnits(bani) / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "RON",
    minimumFractionDigits: 2,
  }).format(value);
}

export function parseRonToBani(input: string): number {
  const normalized = input.replace(",", ".").replace(/[^\d.]/g, "");
  const n = Number.parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid amount");
  }
  return Math.round(n * 100);
}

export function toMinorUnits(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) throw new Error("Invalid amount");
    return Number.isInteger(input) ? assertMinorUnits(input) : Math.round(input * 100);
  }
  return parseRonToBani(input);
}

export function fromMinorUnits(bani: number): number {
  return assertMinorUnits(bani) / 100;
}
