import type { AppLocale } from "@/i18n/routing";

const ORDER: Record<string, { ro: string; en: string }> = {
  PENDING: { ro: "În așteptare", en: "Pending" },
  CONFIRMED: { ro: "Confirmată", en: "Confirmed" },
  PROCESSING: { ro: "În procesare", en: "Processing" },
  FULFILLED: { ro: "Livrată", en: "Fulfilled" },
  CANCELLED: { ro: "Anulată", en: "Cancelled" },
  REFUNDED: { ro: "Rambursată", en: "Refunded" },
};

const PAYMENT: Record<string, { ro: string; en: string }> = {
  PENDING: { ro: "Plată în așteptare", en: "Payment pending" },
  AUTHORIZED: { ro: "Autorizată", en: "Authorized" },
  PAID: { ro: "Plătită", en: "Paid" },
  FAILED: { ro: "Eșuată", en: "Failed" },
  REFUNDED: { ro: "Rambursată", en: "Refunded" },
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
