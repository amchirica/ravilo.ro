export type PublicStockStatus = "IN_STOCK" | "LOW" | "OUT";

export function publicStockStatus(available: number, threshold: number): PublicStockStatus {
  if (available <= 0) return "OUT";
  if (available <= threshold) return "LOW";
  return "IN_STOCK";
}
