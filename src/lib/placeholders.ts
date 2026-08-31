import type { StoreSettings } from "@/schemas/settings";

export function freeShippingLei(settings: StoreSettings): number {
  return Math.round(settings.freeShippingThreshold / 100);
}

export function interpolateSettings(template: string, settings: StoreSettings): string {
  return template.replaceAll("{{free_shipping_threshold}}", String(freeShippingLei(settings)));
}
