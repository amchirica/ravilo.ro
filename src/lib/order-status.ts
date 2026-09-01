import type { AppLocale } from "@/i18n/routing";

const ORDER: Record<string, { ro: string; en: string }> = {
  DRAFT: { ro: "Ciornă", en: "Draft" },
  PENDING: { ro: "Comandă primită", en: "Order received" },
  PENDING_PAYMENT: { ro: "Comandă primită", en: "Order received" },
  CONFIRMED: { ro: "Plată confirmată", en: "Payment confirmed" },
  PAID: { ro: "Plată confirmată", en: "Payment confirmed" },
  PROCESSING: { ro: "În pregătire", en: "Preparing" },
  READY_TO_SHIP: { ro: "În pregătire", en: "Preparing" },
  SHIPPED: { ro: "Expediată", en: "Shipped" },
  FULFILLED: { ro: "Livrată", en: "Delivered" },
  DELIVERED: { ro: "Livrată", en: "Delivered" },
  CANCELLED: { ro: "Anulată", en: "Cancelled" },
  REFUNDED: { ro: "Rambursată", en: "Refunded" },
  PARTIALLY_REFUNDED: { ro: "Rambursată parțial", en: "Partially refunded" },
};

const PAYMENT: Record<string, { ro: string; en: string }> = {
  UNPAID: { ro: "Plată în așteptare", en: "Payment pending" },
  PENDING: { ro: "Plată în așteptare", en: "Payment pending" },
  AUTHORIZED: { ro: "Autorizată", en: "Authorized" },
  PAID: { ro: "Plată confirmată", en: "Payment confirmed" },
  FAILED: { ro: "Nefinalizată", en: "Not completed" },
  REFUNDED: { ro: "Rambursată", en: "Refunded" },
  PARTIALLY_REFUNDED: { ro: "Rambursată parțial", en: "Partially refunded" },
  CANCELLED: { ro: "Anulată", en: "Cancelled" },
};

function label(map: Record<string, { ro: string; en: string }>, value: string, locale: AppLocale) {
  const row = map[value];
  if (!row) return value;
  return locale === "en" ? row.en : row.ro;
}

export function orderStatusLabel(value: string, locale: AppLocale) {
  return label(ORDER, value, locale);
}

export function paymentStatusLabel(value: string, locale: AppLocale) {
  return label(PAYMENT, value, locale);
}

const ACTIONS: Record<string, { ro: string; en: string }> = {
  PROCESSING: { ro: "Pregătește comanda", en: "Start preparing" },
  READY_TO_SHIP: { ro: "Gata de expediere", en: "Ready to ship" },
  SHIPPED: { ro: "Marchează expediată", en: "Mark shipped" },
  DELIVERED: { ro: "Marchează livrată", en: "Mark delivered" },
  CANCELLED: { ro: "Anulează comanda", en: "Cancel order" },
  PAID: { ro: "Marchează plătită", en: "Mark paid" },
};

export function orderActionLabel(value: string, locale: AppLocale) {
  return label(ACTIONS, value, locale);
}
